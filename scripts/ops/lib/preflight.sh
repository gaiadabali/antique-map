# shellcheck shell=bash
# Read-only checks that run before anything changes: the host's tools, the Postgres target,
# free disk, and for each site its user, its home, its port and its CloudPanel vhost. A failure
# here stops an apply run before its first change; a dry run carries on so the reviewer still
# sees the whole plan.

VHOST_DIR=/etc/nginx/sites-enabled
CREATE_SITES=0
NODE_MAJOR_FOR_SITES=22
MIN_NODE=22.13.0
# Refuse below either floor (DEPLOYMENT.md §2: Helios's disk reached 93% in September 2026).
MIN_FREE_GB=20
MIN_FREE_PCT=15
# The Postgres cluster: named explicitly, and checked to be that port and major 18 (should-fix 12).
PG_PORT=5432
PG_PORT_EXPLICIT=0
PG_MAJOR=18
PG_OK=0

host_preflight() {
  say "host"
  [ "$(id -u)" = 0 ] || die "run as root (it reads every site's sockets and writes system units)"
  [ "$(uname -s)" = Linux ] || die "this provisions a Linux host"
  need_cmd runuser ss systemctl crontab curl flock logrotate stat install useradd usermod getent \
    df awk sed grep sort diff mktemp sha256sum python3 tar psql pg_dump pg_restore openssl \
    fallocate mkfs.ext4 mountpoint readlink env
  pg_preflight
  disk_check
  if command -v ufw >/dev/null 2>&1; then
    note "ufw: $(ufw status 2>/dev/null | head -n 1) — 5.1.d confirms from outside that app ports refuse"
  fi
}

pg_q() { runuser -u postgres -- psql -X -q -At -p "$PG_PORT" -d postgres -c "$1"; }

pg_preflight() {
  if command -v pg_lsclusters >/dev/null 2>&1; then
    local n
    n="$(pg_lsclusters -h 2>/dev/null | wc -l)"
    if [ "$n" -gt 1 ] && [ "$PG_PORT_EXPLICIT" = 0 ]; then
      fail "Postgres: pg_lsclusters shows $n clusters; name the one to use with --pg-port"
      return 0
    fi
  fi
  if ! pg_q 'select 1' >/dev/null 2>&1; then
    fail "Postgres: nothing answers 'psql -p $PG_PORT' as postgres (--pg-port)"
    return 0
  fi
  local port version num
  port="$(pg_q 'show port')"
  num="$(pg_q 'show server_version_num')"
  version="$(pg_q 'show server_version')"
  if [ "$port" != "$PG_PORT" ]; then
    fail "Postgres: the cluster reached on $PG_PORT says its port is $port"
  elif [ "$((num / 10000))" != "$PG_MAJOR" ]; then
    fail "Postgres $version on $PG_PORT: the engine runs major $PG_MAJOR (DEPLOYMENT.md §4.2)"
  else
    ok "Postgres $version on port $PG_PORT"
    PG_OK=1
  fi
}

# free_space DIR — "mount total_kib avail_kib" for the filesystem that holds DIR (or its parent).
free_space() {
  local dir="$1"
  while [ ! -e "$dir" ]; do dir="$(dirname "$dir")"; done
  df -Pk "$dir" | awk 'NR == 2 { print $6, $2, $4 }'
}

# disk_check — every filesystem this run writes to keeps both floors, counting the RustFS image
# a first run would preallocate on it (should-fix 4).
disk_check() {
  local mount total avail pct gb seen='' dir reserve
  for dir in "$RUSTFS_HOME" /var/backups /home; do
    read -r mount total avail <<<"$(free_space "$dir")"
    case " $seen " in *" $mount "*) continue ;; esac
    seen="$seen $mount"
    reserve=0
    if [ "$dir" = "$RUSTFS_HOME" ] && [ ! -e "$RUSTFS_IMAGE" ]; then reserve=$((RUSTFS_SIZE_GB * 1048576)); fi
    pct=$(((avail - reserve) * 100 / total))
    gb=$(((avail - reserve) / 1048576))
    local what="${gb} GiB free (${pct}%)"
    [ "$reserve" = 0 ] || what="$((avail / 1048576)) GiB free now, ${gb} GiB (${pct}%) after the ${RUSTFS_SIZE_GB} GiB RustFS image"
    if [ "$gb" -lt "$MIN_FREE_GB" ] || [ "$pct" -lt "$MIN_FREE_PCT" ]; then
      fail "disk: $mount (holds $dir) has $what: below the floor of ${MIN_FREE_GB} GiB and ${MIN_FREE_PCT}% (--min-free-gb, --min-free-pct, --rustfs-size-gb)"
    else
      ok "disk: $mount (holds $dir) has $what; floor ${MIN_FREE_GB} GiB and ${MIN_FREE_PCT}%"
    fi
  done
}

# port_probe PORT — "free", or "USERS|ADDRESSES" of whatever listens on it.
port_probe() {
  local lines pid users="" addrs hex uid
  lines="$(ss -Hltnp "sport = :$1" 2>/dev/null || true)"
  if [ -z "$lines" ]; then
    printf 'free'
    return 0
  fi
  addrs="$(awk '{ print $4 }' <<<"$lines" | sort -u | paste -sd, -)"
  # The socket's owner from /proc/net/tcp{,6} (LISTEN is state 0A, the uid is field 8): exact
  # even where ss cannot name the process (no ptrace capability, a container).
  hex="$(printf '%04X' "$1")"
  while read -r uid; do
    users="$users $(getent passwd "$uid" | cut -d: -f1)"
  done < <(awk -v p=":$hex" '$4 == "0A" && substr($2, length($2) - 4) == p { print $8 }' \
    /proc/net/tcp /proc/net/tcp6 2>/dev/null | sort -u)
  if [ -z "${users// /}" ]; then
    while read -r pid; do
      [ -z "$pid" ] || users="$users $(stat -c %U "/proc/$pid" 2>/dev/null || printf '?')"
    done < <(grep -o 'pid=[0-9]*' <<<"$lines" | cut -d= -f2 | sort -u)
  fi
  users="$(tr ' ' '\n' <<<"$users" | sed '/^$/d' | sort -u | paste -sd, -)"
  printf '%s|%s' "${users:-?}" "$addrs"
}

# loopback_only ADDRESSES — every comma-separated address is 127.0.0.1:<port>.
loopback_only() {
  local a
  for a in ${1//,/ }; do
    case "$a" in 127.0.0.1:*) ;; *) return 1 ;; esac
  done
}

# check_port PORT OWNER LABEL — free, or already held by OWNER on loopback alone.
check_port() {
  local port="$1" owner="$2" label="$3" probe users addrs
  probe="$(port_probe "$port")"
  if [ "$probe" = free ]; then
    ok "port $port is free for $label"
    return 0
  fi
  users="${probe%%|*}" addrs="${probe#*|}"
  if [ "$users" = "$owner" ]; then
    if loopback_only "$addrs"; then
      ok "port $port: $label already listening as $owner on $addrs"
    else
      fail "port $port: $label listens on $addrs — loopback (127.0.0.1) only (DEPLOYMENT.md §3)"
    fi
  else
    fail "port $port ($label) is taken by $users on $addrs: pick another (--rustfs-port, --site …)"
  fi
}

site_preflight() {
  say "site ($ENVIRONMENT): $S_USER, port $S_PORT, $S_DB/$S_ROLE; shop $SHOP_HOSTS, gallery $GALLERY_HOSTS"
  if id -u "$S_USER" >/dev/null 2>&1; then
    ok "site user $S_USER exists (uid $(id -u "$S_USER"))"
    home_link_check
  elif [ "$CREATE_SITES" = 1 ]; then
    command -v clpctl >/dev/null 2>&1 || fail "--create-sites needs CloudPanel's clpctl on PATH"
    note "no site user $S_USER yet: --create-sites adds the CloudPanel Node.js site $S_DOMAIN"
  else
    fail "no site user $S_USER: add the CloudPanel Node.js site ($S_DOMAIN, app port $S_PORT, site user $S_USER) or re-run with --create-sites"
  fi
  check_port "$S_PORT" "$S_USER" "the app"
  vhost_check
  db_preflight
  env_preflight
}

# vhost_server_names CONF — every name the vhost's server_name lines list, one per line.
vhost_server_names() {
  sed -nE 's/^[[:space:]]*server_name[[:space:]]+([^;]*);.*/\1/p' "$1" | tr -s ' \t' '\n' | sed '/^$/d' | sort -u
}

vhost_check() {
  local conf="$VHOST_DIR/$S_DOMAIN.conf" others h missing='' names
  if [ ! -f "$conf" ]; then
    if [ "$CREATE_SITES" = 1 ] && ! id -u "$S_USER" >/dev/null 2>&1; then
      note "vhost $conf: CloudPanel writes it when --create-sites adds the site"
    else
      fail "no CloudPanel vhost at $conf (--vhost-dir if CloudPanel keeps them elsewhere)"
    fi
  else
    if grep -Eq "proxy_pass[[:space:]]+http://127\.0\.0\.1:$S_PORT([;/[:space:]]|$)" "$conf"; then
      ok "vhost $conf proxies to http://127.0.0.1:$S_PORT"
    else
      fail "vhost $conf does not proxy to http://127.0.0.1:$S_PORT (DEPLOYMENT.md §3): $(grep -Eo 'proxy_pass[^;]*' "$conf" | sort -u | paste -sd' ' -)"
    fi
    # One vhost serves every host, and passes Host through, which picks the site (§2). The
    # names go in through CloudPanel's vhost editor, so a missing one warns: the report says how.
    names="$(vhost_server_names "$conf")"
    while read -r h; do
      grep -qxF "$h" <<<"$names" || missing="$missing $h"
    done < <(all_hosts)
    if [ -z "$missing" ]; then
      ok "vhost $conf: server_name names every host ($(all_hosts | paste -sd' ' -))"
    else
      warn "vhost $conf: server_name lacks$missing — add them in CloudPanel's vhost editor (the report shows the line)"
    fi
  fi
  others="$(grep -lE "(127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\]):$S_PORT([^0-9]|$)" "$VHOST_DIR"/* 2>/dev/null |
    grep -vxF -e "$conf" || true)"
  [ -z "$others" ] || fail "port $S_PORT is already an upstream of another vhost: $others"
  # Another site's vhost answering one of our hosts would win nginx's choice for it.
  local f
  for f in "$VHOST_DIR"/*; do
    [ -f "$f" ] && [ "$f" != "$conf" ] || continue
    names="$(vhost_server_names "$f")"
    while read -r h; do
      if grep -qxF "$h" <<<"$names"; then
        fail "$h is a server_name of another vhost: $f (retire the old site first: docs/ops/helios-staging.md)"
      fi
    done < <(all_hosts)
  done
}

# ensure_cloudpanel_site — only with --create-sites, only when the site user is missing. This
# DOES touch nginx: clpctl writes the site's vhost and reloads the host's shared nginx.
SITE_PLANNED=0
ensure_cloudpanel_site() {
  id -u "$S_USER" >/dev/null 2>&1 && return 0
  [ "$CREATE_SITES" = 1 ] || return 0
  act "add the CloudPanel Node.js site $S_DOMAIN (site user $S_USER, app port $S_PORT, Node $NODE_MAJOR_FOR_SITES) — clpctl writes its vhost and reloads the shared nginx — then lock its password" \
    create_cloudpanel_site
  if dry; then SITE_PLANNED=1; fi
}

create_cloudpanel_site() {
  local pw
  # clpctl takes the password only as an argument, where another local user could read it in
  # the process list for a moment; so it is random, never printed, and locked right after.
  # SSH to the site user is by key; CloudPanel can set a new password when one is wanted.
  pw="$(random_hex 24)"
  clpctl site:add:nodejs --domainName="$S_DOMAIN" --nodejsVersion="$NODE_MAJOR_FOR_SITES" \
    --appPort="$S_PORT" --siteUser="$S_USER" --siteUserPassword="$pw" >/dev/null
  usermod -L "$S_USER"
}
