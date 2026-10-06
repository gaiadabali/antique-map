# shellcheck shell=bash
# Helpers for in-container.sh and its step files: start Postgres, pack the script, run it, and
# snapshot everything a run could touch.
# shellcheck disable=SC2012 # ls -t over /tmp/snap.<digits>, names this file makes

pg_ctlcluster 18 main start
install -d /var/cache/indies && cp /seed/* /var/cache/indies/
bash /ops/pack.sh >/tmp/provision.sh 2>/tmp/pack.log
cat /tmp/pack.log

# Staging's one site (DEPLOYMENT.md §2): the CloudPanel site is the shop's canonical host.
U=uindies
SHOP=old-east-indies.gaiada.com
GALLERY=indies-gallery.gaiada.com
VH=/etc/nginx/sites-enabled
CONF="$VH/$SHOP.conf"

run() { bash -s -- "$@" </tmp/provision.sh; }
pass() { printf '\nPASS  %s\n' "$*"; }
die() {
  printf '\nFAIL  %s\n' "$*"
  exit 1
}
changes() { sed -n 's/^   changes: \([0-9]*\).*/\1/p' "$1"; }
log() { printf '/tmp/run-%s.log' "$1"; }
pm2_as() {
  local u="$1"
  shift
  runuser -u "$u" -- env -i HOME="/home/$u" PATH=/usr/bin:/bin /usr/bin/pm2 "$@"
}
# The whole state a run could touch, the site user's ~/.pm2 included: a probe that starts a pm2
# daemon shows up here. RustFS's live data directory is left out.
snapshot() {
  {
    find /etc /home /opt /usr/local/sbin /var/backups /var/lib/indies-rustfs /var/lib/indies-mailpit \
      /var/spool/cron /root -xdev \( -type f -o -type l \) 2>/dev/null |
      grep -vE '^/var/lib/indies-rustfs/data/|mailpit\.db|^/etc/(ld\.so\.cache|mtab)$|/\.pm2/logs/' |
      sort | xargs -r sha256sum 2>/dev/null
    find /etc /home /opt /var/backups /var/lib/indies-rustfs /root -xdev -printf '%p %m %u:%g %l\n' 2>/dev/null |
      grep -vE '^/var/lib/indies-rustfs/data/|/\.pm2/logs' | sort
    runuser -u postgres -- psql -XAtc "select rolname, rolcreatedb, rolconnlimit, coalesce(rolpassword, '') from pg_authid order by 1"
    runuser -u postgres -- psql -XAtc "select datname, datacl from pg_database order by 1"
    crontab -u "$U" -l 2>/dev/null || true
  } >"/tmp/snap.$(date +%s%N)"
  sha256sum <"$(ls -t /tmp/snap.* | head -n 1)"
}
# unchanged BEFORE WHAT — fail, with the difference, when the host changed since BEFORE.
unchanged() {
  [ "$1" = "$(snapshot)" ] && return 0
  diff "$(ls -t /tmp/snap.* | sed -n 2p)" "$(ls -t /tmp/snap.* | head -n 1)" | head -20
  die "$2"
}
