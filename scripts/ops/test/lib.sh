# shellcheck shell=bash
# Helpers for in-container.sh and its step files: start Postgres, pack the script, run it, and
# snapshot everything a run could touch.
# shellcheck disable=SC2012 # ls -t over /tmp/snap.<digits>, names this file makes

pg_ctlcluster 18 main start
install -d /var/cache/indies && cp /seed/* /var/cache/indies/
bash /ops/pack.sh >/tmp/provision.sh 2>/tmp/pack.log
cat /tmp/pack.log

# The first Helios run's specs (2026-10-01), before the owner renamed the staging hosts.
OLD=(--gallery uig:4030:ig_db:ig:ig.gaiada.com --emporium uoei:4031:oei_db:oei:oei.gaiada.com)
VH=/etc/nginx/sites-enabled
NVM=v$(node -p process.versions.node)

run() { bash -s -- --rustfs-size-gb 2 "$@" </tmp/provision.sh; }
pass() { printf '\nPASS  %s\n' "$*"; }
die() {
  printf '\nFAIL  %s\n' "$*"
  exit 1
}
changes() { sed -n 's/^   changes: \([0-9]*\).*/\1/p' "$1"; }
log() { printf '/tmp/run-%s.log' "$1"; }
# The whole state a run could touch, the site users' ~/.pm2 included: a probe that starts a pm2
# daemon shows up here. RustFS's live data (its own mounted image) is left out.
snapshot() {
  {
    find /etc /home /opt /usr/local/sbin /var/backups /var/lib/indies-rustfs /var/lib/indies-mailpit \
      /var/spool/cron /root -xdev \( -type f -o -type l \) 2>/dev/null |
      grep -vE '^/var/lib/indies-rustfs/data(\.img)?/|^/var/lib/indies-rustfs/data\.img$|mailpit\.db|^/etc/(ld\.so\.cache|mtab)$|/\.pm2/logs/' |
      sort | xargs -r sha256sum 2>/dev/null
    find /etc /home /opt /var/backups /var/lib/indies-rustfs /root -xdev -printf '%p %m %u:%g %l\n' 2>/dev/null |
      grep -vE '^/var/lib/indies-rustfs/data/|/\.pm2/logs' | sort
    runuser -u postgres -- psql -XAtc "select rolname, rolcreatedb, rolconnlimit, coalesce(rolpassword, '') from pg_authid order by 1"
    runuser -u postgres -- psql -XAtc "select datname, datacl from pg_database order by 1"
    for u in uig uoei; do crontab -u "$u" -l 2>/dev/null || true; done
  } >"/tmp/snap.$(date +%s%N)"
  sha256sum <"$(ls -t /tmp/snap.* | head -n 1)"
}
# unchanged BEFORE WHAT — fail, with the difference, when the host changed since BEFORE.
unchanged() {
  [ "$1" = "$(snapshot)" ] && return 0
  diff "$(ls -t /tmp/snap.* | sed -n 2p)" "$(ls -t /tmp/snap.* | head -n 1)" | head -20
  die "$2"
}
