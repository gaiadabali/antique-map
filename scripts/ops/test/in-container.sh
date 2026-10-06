#!/usr/bin/env bash
# The scenario container-test.sh runs inside the stand-in host. Each step prints PASS or stops.
# shellcheck disable=SC2015 # "check && check || die": die runs when any check fails, as meant
# shellcheck source-path=SCRIPTDIR
set -euo pipefail
# shellcheck source=lib.sh
. /ops/test/lib.sh

# Steps 1-6: the one site made, idempotent, its vhost, symlinks, pm2 trust and adoption.
# shellcheck source=steps-site.sh
. /ops/test/steps-site.sh

# 7. What the runs built (DEPLOYMENT.md §2, §3, §8).
[ "$(runuser -u postgres -- psql -XAtc "select string_agg(concat_ws('|', rolname, rolcreatedb, rolconnlimit, shobj_description(oid, 'pg_authid')), ',') from pg_roles where rolname = 'indies'")" = 'indies|f|20|indies-provision' ] || die "role"
[ "$(runuser -u postgres -- psql -XAtc "select pg_get_userbyid(datdba) from pg_database where datname = 'indies_db'")" = indies ] || die "indies_db"
ss -Hltn | awk '{print $4}' | grep -E ':(403[0-9]|9001)$' | sort | tee /tmp/listen
grep -vq '^127\.0\.0\.1:' /tmp/listen && die "something listens beyond loopback"
[ "$(wc -l </tmp/listen)" = 4 ] || die "expected 4 loopback listeners: the app, RustFS, Mailpit's two (no console)"
! mountpoint -q /var/lib/indies-rustfs/data && [ ! -e /var/lib/indies-rustfs/data.img ] || die "RustFS data must be a plain directory"
[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4030/api/health)" = 503 ] || die "holding server"
[ -f "/home/$U/releases/bootstrap-holding/engine/apps/web/server.js" ] || die "the holding server is not where web's server.js goes"
grep -q "^User=$U$" "/etc/systemd/system/pm2-$U.service" && grep -q '^ExecStart=/usr/bin/pm2 resurrect$' "/etc/systemd/system/pm2-$U.service" || die "pm2 unit"
[ ! -e /root/.pm2 ] || die "a root pm2 daemon was left"
E="/home/$U/ecosystem.config.cjs"
grep -q "name: '$U'" "$E" && grep -q "exec_mode: 'fork'" "$E" && grep -q 'instances: 1,' "$E" && grep -q "HOSTNAME: 'localhost'" "$E" &&
  grep -q "PORT: '4030'" "$E" && grep -q "script: '/home/$U/current/engine/apps/web/server.js'" "$E" &&
  grep -q -- '--dns-result-order=ipv4first' "$E" && ! grep -q BRAND "$E" || die "ecosystem"
crontab -u "$U" -l | grep -qx 'MAILTO=""' && crontab -u "$U" -l | grep -q "^\* \* \* \* \* /home/$U/bin/indies-cron jobs 200,409 900$" &&
  crontab -u "$U" -l | grep -q "^\*/10 \* \* \* \* /home/$U/bin/indies-cron reconcile 200,204 300$" || die "crontab"
[ -z "$(find /etc/systemd/system /etc/logrotate.d /usr/local/sbin -name '*.bak*')" ] || die ".bak files in config dirs"
V="/home/$U/shared/.env"
for l in "GALLERY_HOSTS=$GALLERY" "SHOP_HOSTS=$SHOP" "ADMIN_HOST=$SHOP" RUN_MIGRATIONS=1 HOSTNAME=localhost PORT=4030 \
  REVALIDATE_ORIGIN=http://127.0.0.1:4030 'DATABASE_URL=postgres://indies:@127.0.0.1:5432/indies_db' \
  S3_BUCKET=indies-media "S3_ACCESS_KEY_ID=$U" "MASTERS_ACCESS_KEY_ID=$U" MASTERS_BUCKET=archive-masters \
  "MEDIA_PUBLIC_URL=https://$SHOP/_media" MIDTRANS_MODE=simulate SMTP_USER=indies-staging; do
  grep -qxF "$l" "$V" || die ".env lacks $l"
done
grep -Eq '^(BRAND|BRAND_ROOT|SITE_URL|SISTER_[A-Z_]*|LINK_TOKEN_KEYS)=' "$V" && die ".env carries a two-app variable"
grep -q "^SMTP_PASS=$(cat /etc/indies/mailpit/smtp-password)$" "$V" || die "SMTP in .env"
[ "$(stat -c '%a %U' "$V")" = "600 $U" ] || die ".env mode"
[ "$(cat /etc/indies/backup-databases)" = indies_db ] || die "the backup list is not indies_db alone"
pass "role indies marked, NOCREATEDB, limit 20; indies_db; 4 loopback listeners; fork x1 on localhost:4030; §8's .env; the backup list"

# 8. Secrets: a masters secret that is not the media one refuses the run (one key); then both
#    the same, and the next run converges Postgres (a SCRAM verifier) and RustFS.
fill() { sed -i "s|^$1=.*|$1=$2|" "$V"; }
dbpw="$(openssl rand -hex 20)" k1="$(openssl rand -hex 20)"
sed -i "s|^DATABASE_URL=postgres://indies:@|DATABASE_URL=postgres://indies:$dbpw@|" "$V"
fill S3_SECRET_ACCESS_KEY "$k1"
fill MASTERS_SECRET_ACCESS_KEY "$(openssl rand -hex 20)"
fill CRON_SECRET "$(openssl rand -hex 20)"
before="$(snapshot)"
run --env staging >"$(log two-keys)" 2>&1 && die "two different storage secrets were accepted"
grep -q 'S3_SECRET_ACCESS_KEY and MASTERS_SECRET_ACCESS_KEY differ' "$(log two-keys)" || die "the two secrets not named"
unchanged "$before" "the two-secrets refusal changed the host"
fill MASTERS_SECRET_ACCESS_KEY "$k1"
PGLOG=/var/log/postgresql/postgresql-18-main.log
pglog_from=$(($(wc -l <"$PGLOG") + 1))
run --env staging --dry-run >"$(log dry2)" 2>&1 || true
grep -q "WOULD  store role indies's SCRAM-SHA-256 verifier" "$(log dry2)" || die "dry run does not plan the password"
run --env staging >"$(log apply4)" 2>&1 || { cat "$(log apply4)"; die "apply with secrets failed"; }
grep -q "DO     create RustFS key $U with the secret" "$(log apply4)" || die "the key not made"
run --env staging >"$(log apply5)" 2>&1 || die "apply after secrets failed"
[ "$(changes "$(log apply5)")" = 0 ] || die "not idempotent after the secrets"
# shellcheck disable=SC2016 # a literal $ in the pattern
runuser -u postgres -- psql -XAtc "select rolpassword from pg_authid where rolname = 'indies'" | grep -q '^SCRAM-SHA-256\$4096:' || die "no SCRAM verifier"
PGPASSWORD="$dbpw" psql -XAt -h 127.0.0.1 -U indies -d indies_db -c 'select 1' >/dev/null || die "indies cannot log in"
[ "$(runuser -u postgres -- psql -XAtc "select count(*) from pg_database d, aclexplode(coalesce(d.datacl, acldefault('d', d.datdba))) a where d.datname = 'indies_db' and a.grantee = 0")" = 0 ] ||
  die "PUBLIC holds a privilege on indies_db"
tail -n +"$pglog_from" "$PGLOG" | grep -q 'authentication failed' && die "a run tried a failing login"
grep -rqE "$dbpw|$k1|$(cat /etc/indies/mailpit/ui-password)" /tmp/run-*.log && die "a log carries a secret"
pass "two storage secrets refused; one key converged ($(changes "$(log apply4)") changes), then 0; SCRAM verifier; no failed login; no secret in any log"

# Steps 9-15: storage, mail and cron, backups, drift and refusals, --verify-restart, --report.
# shellcheck source=steps-checks.sh
. /ops/test/steps-checks.sh

printf '\n--- the report of the converged run ---\n'
sed -n '/^== report: shared/,$p' "$(log apply5)" | grep -v '^          |'
echo
echo "ALL PASS"
