# shellcheck shell=bash
# Read-only checks that run before anything changes: the host's tools, Postgres, free disk, and
# for each site its user, its port and its CloudPanel vhost. A failure here stops an apply run
# before its first change; a dry run carries on so the reviewer still sees the whole plan.

VHOST_DIR=/etc/nginx/sites-enabled
CREATE_SITES=0
NODE_MAJOR_FOR_SITES=22
MIN_NODE=22.13.0
# Refuse below either floor (DEPLOYMENT.md §2: Helios's disk reached 93% in September 2026).
MIN_FREE_GB=20
MIN_FREE_PCT=15
PG_PORT=''

host_preflight() {
  say "host"
  [ "$(id -u)" = 0 ] || die "run as root (it reads every site's sockets and writes system units)"
  [ "$(uname -s)" = Linux ] || die "this provisions a Linux host"
  need_cmd runuser ss systemctl crontab curl flock logrotate stat install useradd usermod getent \
    df awk sed grep sort diff mktemp sha256sum python3 tar psql pg_dump pg_restore
  if ! runuser -u postgres -- psql -X -q -At -c 'select 1' >/dev/null 2>&1; then
    fail "Postgres: 'runuser -u postgres -- psql' cannot connect (is the local cluster running?)"
  else
    PG_PORT="$(runuser -u postgres -- psql -X -q -At -c 'show port')"
    local v
    v="$(runuser -u postgres -- psql -X -q -At -c 'show server_version_num')"
    if [ "$v" -ge 180000 ]; then
      ok "Postgres $(runuser -u postgres -- psql -X -q -At -c 'show server_version') on port $PG_PORT"
    else
      warn "Postgres is $v, not 18: local and CI run 18 (DEPLOYMENT.md §4.2); check anything version-sensitive"
    fi
  fi
  disk_check
  if command -v ufw >/dev/null 2>&1; then
    note "ufw: $(ufw status 2>/dev/null | head -n 1) — 5.1.d confirms from outside that app ports refuse"
  fi
}

# free_space DIR — "mount total_kib avail_kib" for the filesystem that holds DIR (or its parent).
free_space() {
  local dir="$1"
  while [ ! -e "$dir" ]; do dir="$(dirname "$dir")"; done
  df -Pk "$dir" | awk 'NR == 2 { print $6, $2, $4 }'
}

disk_check() {
  local mount total avail pct gb seen='' dir
  for dir in "$RUSTFS_DATA" /var/backups /home; do
    read -r mount total avail <<<"$(free_space "$dir")"
    case " $seen " in *" $mount "*) continue ;; esac
    seen="$seen $mount"
    pct=$((avail * 100 / total))
    gb=$((avail / 1048576))
    if [ "$gb" -lt "$MIN_FREE_GB" ] || [ "$pct" -lt "$MIN_FREE_PCT" ]; then
      fail "disk: $mount (holds $dir) has ${gb} GiB free (${pct}%): below the floor of ${MIN_FREE_GB} GiB and ${MIN_FREE_PCT}% (--min-free-gb, --min-free-pct)"
    else
      ok "disk: $mount (holds $dir) has ${gb} GiB free (${pct}%), floor ${MIN_FREE_GB} GiB and ${MIN_FREE_PCT}%"
    fi
  done
}

# port_probe PORT — "free", or "USERS|ADDRESSES" of whatever listens on it.
port_probe() {
  local lines pid users="" addrs
  lines="$(ss -Hltnp "sport = :$1" 2>/dev/null || true)"
  if [ -z "$lines" ]; then
    printf 'free'
    return 0
  fi
  addrs="$(awk '{ print $4 }' <<<"$lines" | sort -u | paste -sd, -)"
  # The socket's owner from /proc/net/tcp{,6} (LISTEN is state 0A, the uid is field 8): exact
  # even where ss cannot name the process (no ptrace capability, a container).
  local hex uid
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
    fail "port $port ($label) is taken by $users on $addrs: pick another (--rustfs-port, --gallery …)"
  fi
}

site_preflight() {
  say "$S_APP ($S_LABEL, $ENVIRONMENT): $S_USER, port $S_PORT, $S_DB/$S_ROLE, $S_DOMAIN"
  if id -u "$S_USER" >/dev/null 2>&1; then
    ok "site user $S_USER exists (uid $(id -u "$S_USER"))"
    [ -d "$S_HOME" ] || fail "$S_HOME is missing"
  elif [ "$CREATE_SITES" = 1 ]; then
    command -v clpctl >/dev/null 2>&1 || fail "--create-sites needs CloudPanel's clpctl on PATH"
    note "no site user $S_USER yet: --create-sites adds the CloudPanel Node.js site"
  else
    fail "no site user $S_USER: add the CloudPanel Node.js site ($S_DOMAIN, app port $S_PORT, site user $S_USER) or re-run with --create-sites"
  fi
  check_port "$S_PORT" "$S_USER" "$S_APP"
  vhost_check
  db_preflight
  env_preflight
}

vhost_check() {
  local conf="$VHOST_DIR/$S_DOMAIN.conf" others
  if [ ! -f "$conf" ]; then
    if [ "$CREATE_SITES" = 1 ] && ! id -u "$S_USER" >/dev/null 2>&1; then
      note "vhost $conf: CloudPanel writes it when --create-sites adds the site"
    else
      fail "no CloudPanel vhost at $conf (--vhost-dir if CloudPanel keeps them elsewhere)"
    fi
  elif grep -Eq "proxy_pass[[:space:]]+http://127\.0\.0\.1:$S_PORT([;/[:space:]]|$)" "$conf"; then
    ok "vhost $conf proxies to http://127.0.0.1:$S_PORT"
  else
    fail "vhost $conf does not proxy to http://127.0.0.1:$S_PORT (DEPLOYMENT.md §3): $(grep -Eo 'proxy_pass[^;]*' "$conf" | sort -u | paste -sd' ' -)"
  fi
  others="$(grep -lE "(127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\]):$S_PORT([^0-9]|$)" "$VHOST_DIR"/* 2>/dev/null |
    grep -vxF "$conf" || true)"
  [ -z "$others" ] || fail "port $S_PORT is already an upstream of another vhost: $others"
}

# ensure_cloudpanel_site — only with --create-sites, only when the site user is missing.
ensure_cloudpanel_site() {
  id -u "$S_USER" >/dev/null 2>&1 && return 0
  [ "$CREATE_SITES" = 1 ] || return 0
  act "add the CloudPanel Node.js site $S_DOMAIN (site user $S_USER, app port $S_PORT, Node $NODE_MAJOR_FOR_SITES), then lock its password" \
    create_cloudpanel_site
}

create_cloudpanel_site() {
  local pw
  # clpctl takes the password only as an argument, where another local user could read it in
  # the process list for a moment; so it is random, never printed, and locked right after.
  # SSH to the site user is by key; CloudPanel can set a new password when one is wanted.
  pw="$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  clpctl site:add:nodejs --domainName="$S_DOMAIN" --nodejsVersion="$NODE_MAJOR_FOR_SITES" \
    --appPort="$S_PORT" --siteUser="$S_USER" --siteUserPassword="$pw" >/dev/null
  usermod -L "$S_USER"
}
