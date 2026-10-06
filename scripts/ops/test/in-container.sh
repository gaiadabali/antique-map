#!/usr/bin/env bash
# The scenario container-test.sh runs inside the stand-in host. Each step prints PASS or stops.
# shellcheck disable=SC2015 # "check && check || die": die runs when any check fails, as meant
# shellcheck source-path=SCRIPTDIR
set -euo pipefail
# shellcheck source=lib.sh
. /ops/test/lib.sh

# 0. Review B1: symlinks planted in the homes are each refused, a dry run prints no root-only
#    byte, and nothing anywhere changes.
printf 'TOPSECRET-ROOT-ONLY\n' >/root/secret.txt && chmod 600 /root/secret.txt
install -d -m 700 /etc/victim-dir /root/pm2victim && echo victim >/etc/victim-file
runuser -u uig -- mkdir /home/uig/shared
ln -s /root/secret.txt /home/uig/shared/.env
ln -s /etc/victim-file /home/uig/ecosystem.config.cjs
ln -s /root/pm2victim /home/uig/.pm2
ln -s /etc/victim-dir /home/uoei/bin
ln -s /etc/cron.d /home/uoei/.indies
chown -h uig:uig /home/uig/shared/.env /home/uig/ecosystem.config.cjs /home/uig/.pm2
chown -h uoei:uoei /home/uoei/bin /home/uoei/.indies
before="$(snapshot)"
run --env staging --dry-run >"$(log links-dry)" 2>&1 && die "a dry run over planted symlinks passed"
run --env staging >"$(log links)" 2>&1 && die "an apply over planted symlinks ran"
for l in /home/uig/shared/.env /home/uig/ecosystem.config.cjs /home/uig/.pm2 /home/uoei/bin /home/uoei/.indies; do
  grep -q "refused: $l is a symlink" "$(log links)" || die "the symlink $l was not refused"
done
grep -q TOPSECRET /tmp/run-links*.log && die "a root-only file's bytes reached the output"
grep -q 'nothing was changed' "$(log links)" || die "the apply did not stop before its first change"
unchanged "$before" "a refused run changed the host"
rm /home/uig/shared/.env /home/uig/ecosystem.config.cjs /home/uig/.pm2 /home/uoei/bin /home/uoei/.indies
rmdir /home/uig/shared
pass "5 planted symlinks each refused; no root-only byte printed; host unchanged"

# Steps 1-6: the first Helios run replayed, then --replace-site, pm2 per user, idempotency.
# shellcheck source=steps-replace.sh
. /ops/test/steps-replace.sh

# 7. What the replacement run built.
[ "$(runuser -u postgres -- psql -XAtc "select string_agg(concat_ws('|', rolcreatedb, rolconnlimit, shobj_description(oid, 'pg_authid')), ',' order by rolname) from pg_roles where rolname in ('ig','oei')")" = 'f|20|indies-provision,f|20|indies-provision' ] || die "roles"
ss -Hltn | awk '{print $4}' | grep -E ':(403[0-9]|9001)$' | sort | tee /tmp/listen
grep -vq '^127\.0\.0\.1:' /tmp/listen && die "something listens beyond loopback"
[ "$(wc -l </tmp/listen)" = 5 ] || die "expected 5 loopback listeners (no RustFS console)"
! mountpoint -q /var/lib/indies-rustfs/data && [ ! -e /var/lib/indies-rustfs/data.img ] || die "RustFS data must be a plain directory"
[ "$(stat -c '%a %U' /var/lib/indies-rustfs/data)" = "700 indies-rustfs" ] || die "RustFS data root"
[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4030/api/health)" = 503 ] || die "holding server"
grep -q '^User=uig$' /etc/systemd/system/pm2-uig.service && grep -q '^ExecStart=/usr/bin/pm2 resurrect$' /etc/systemd/system/pm2-uig.service || die "pm2 unit"
[ ! -e /root/.pm2 ] || die "a root pm2 daemon was left"
grep -q '"name": "uig"' /home/uig/.pm2/dump.pm2 || die "dump.pm2"
grep -q "max_memory_restart: '1536M'" /home/uig/ecosystem.config.cjs && grep -q "HOSTNAME: 'localhost'" /home/uig/ecosystem.config.cjs || die "ecosystem"
crontab -u uig -l | grep -qx 'MAILTO=""' && crontab -u uig -l | grep -q '^\* \* \* \* \* /home/uig/bin/indies-cron jobs 200,409 900$' || die "crontab"
[ -z "$(find /etc/systemd/system /etc/logrotate.d /usr/local/sbin -name '*.bak*')" ] || die ".bak files in config dirs"
grep -q '^SMTP_USER=indies-staging$' /home/uig/shared/.env && grep -q "^SMTP_PASS=$(cat /etc/indies/mailpit/smtp-password)$" /home/uig/shared/.env || die "SMTP in .env"
[ "$(stat -c '%a %U' /home/uig/shared/.env)" = "600 uig" ] || die ".env mode"
grep -q '^MemoryMax=2G$' /etc/systemd/system/indies-rustfs.service && grep -q '^MemoryMax=256M$' /etc/systemd/system/indies-mailpit.service || die "memory caps"
pass "roles marked, NOCREATEDB, limit 20; 5 loopback listeners, no console; RustFS data a plain directory; static pm2 unit, no root daemon; MAILTO; no .bak in config dirs"

# 8. Secrets from "Infisical": the next run converges Postgres (a SCRAM verifier) and RustFS.
fill() { sed -i "s|^$2=.*|$2=$3|" "/home/$1/shared/.env"; }
dbpw="$(openssl rand -hex 20)"
sed -i "s|^DATABASE_URL=postgres://ig:@|DATABASE_URL=postgres://ig:$dbpw@|" /home/uig/shared/.env
k1="$(openssl rand -hex 20)" k2="$(openssl rand -hex 20)" k3="$(openssl rand -hex 20)" k4="$(openssl rand -hex 20)"
fill uig S3_SECRET_ACCESS_KEY "$k1"
fill uig MASTERS_SECRET_ACCESS_KEY "$k2"
fill uoei S3_SECRET_ACCESS_KEY "$k3"
fill uoei MASTERS_SECRET_ACCESS_KEY "$k4"
fill uig CRON_SECRET "$(openssl rand -hex 20)"
PGLOG=/var/log/postgresql/postgresql-18-main.log
pglog_from=$(($(wc -l <"$PGLOG") + 1))
run --env staging --dry-run >"$(log dry2)" 2>&1 || true
grep -q "WOULD  store role ig's SCRAM-SHA-256 verifier" "$(log dry2)" || die "dry run does not plan the password"
run --env staging >"$(log apply3)" 2>&1 || { cat "$(log apply3)"; die "apply with secrets failed"; }
run --env staging >"$(log apply4)" 2>&1 || die "apply after secrets failed"
[ "$(changes "$(log apply4)")" = 0 ] || die "not idempotent after the secrets"
# shellcheck disable=SC2016 # a literal $ in the pattern
runuser -u postgres -- psql -XAtc "select rolpassword from pg_authid where rolname = 'ig'" | grep -q '^SCRAM-SHA-256\$4096:' || die "no SCRAM verifier"
PGPASSWORD="$dbpw" psql -XAt -h 127.0.0.1 -U ig -d ig_db -c 'select 1' >/dev/null || die "ig cannot log in"
tail -n +"$pglog_from" "$PGLOG" | grep -q 'authentication failed' && die "a run tried a failing login"

PGPASSWORD="$dbpw" psql -XAt -h 127.0.0.1 -U ig -d oei_db -c 'select 1' >/dev/null 2>&1 && die "ig opened oei_db"
grep -rqE "$dbpw|$k1|$(cat /etc/indies/mailpit/ui-password)" /tmp/run-*.log && die "a log carries a secret"
pass "secrets converged ($(changes "$(log apply3)") changes), then 0; SCRAM verifier; no failed login; no secret in any log"

# 9. The keys do what DEPLOYMENT.md §2 says, and only that.
sed -n '/^s3_py() {/,/^PY$/p' /ops/lib/s3admin.sh | sed '1,2d;$d' >/tmp/s3.py
as() { echo hi >/tmp/o; S3_AK="$1" S3_SK="$2" python3 /tmp/s3.py "$3" "http://127.0.0.1:4032/$4" "${5:-}" /tmp/out; }
[ "$(as uig-media "$k1" PUT ig-media/a.txt /tmp/o)" = 200 ] || die "uig-media cannot write ig-media"
[ "$(as uig-media "$k1" PUT oei-media/a.txt /tmp/o)" = 403 ] || die "uig-media writes oei-media"
[ "$(as uoei-masters "$k4" PUT archive-masters/print-files/p.tif /tmp/o)" = 200 ] || die "uoei-masters print-files"
[ "$(as uoei-masters "$k4" PUT archive-masters/scans/s.tif /tmp/o)" = 403 ] || die "uoei-masters writes scans"
[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4032/ig-media/a.txt)" = 200 ] || die "public read"
[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4032/ig-media)" = 403 ] || die "anonymous listing"
[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4032/archive-masters/print-files/p.tif)" = 403 ] || die "masters public"
pass "keys scoped; public read without listing; masters private"

# 10. Mailpit needs its passwords; the cron wrapper logs a change once, accepts 409.
[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4035/api/v1/messages)" = 401 ] || die "Mailpit UI open"
python3 -c "import smtplib; smtplib.SMTP('127.0.0.1', 4034).sendmail('a@x.test', ['b@x.test'], 'Subject: n\n\nx')" 2>/dev/null && die "Mailpit SMTP took mail without a password"
SP="$(cat /etc/indies/mailpit/smtp-password)" python3 -c "import os, smtplib; s = smtplib.SMTP('127.0.0.1', 4034); s.login('indies-staging', os.environ['SP']); s.sendmail('no-reply@indies-gallery.gaiada.com', ['a@example.test'], 'Subject: t\n\nhi')"
curl -s -u "indies:$(cat /etc/indies/mailpit/ui-password)" http://127.0.0.1:4035/api/v1/messages | grep -q '"Subject":"t"' || die "Mailpit did not catch it"
runuser -u uig -- /home/uig/bin/indies-cron jobs 200,409 900 2>/tmp/cron1.err && die "a 503 counted as success"
runuser -u uig -- /home/uig/bin/indies-cron jobs 200,409 900 2>/tmp/cron2.err || true
grep -q 'answered 503' /tmp/cron1.err && [ ! -s /tmp/cron2.err ] || die "cron did not log once per change"
pkill -u uig -f 'engine/apps/gallery/server.js' || true
sleep 1
runuser -u uig -- node -e "require('http').createServer((q,r)=>{r.writeHead(q.url.startsWith('/api/health')?200:409);r.end('{}')}).listen(4030,'127.0.0.1')" &
FAKE=$!
sleep 1
runuser -u uig -- /home/uig/bin/indies-cron jobs 200,409 900 2>/tmp/cron3.err || die "409 busy counted as failure"
grep -q 'answers 409 again' /tmp/cron3.err || die "recovery not logged"
runuser -u uig -- /home/uig/bin/indies-health 5 1 >/dev/null || die "indies-health"
pkill -P "$FAKE" || true
kill "$FAKE" 2>/dev/null || true
pass "Mailpit UI and SMTP need their passwords; cron logs 503 once, then the recovery; 409 is success"

# 11. The nightly dump restores.
/usr/local/sbin/indies-db-backup || die "backup"
for db in ig_db oei_db; do pg_restore --list /var/backups/indies/$db/*.dump >/dev/null || die "$db dump"; done
pass "indies-db-backup: both dumps readable by pg_restore"

# 12. Drift the script must repair, and refusals that change nothing.
crontab -u uig -r
run --env staging --report >"$(log report)" 2>&1 && die "--report missed the lost crontab block"
grep -q "managed block is gone" "$(log report)" || die "lost block not named"
# (step 6 stopped the holding server: this run starts it again under pm2 and reinstalls the block)
run --env staging >"$(log repair)" 2>&1 || die "repair run failed"
grep -q 'DO     start pm2 process uig' "$(log repair)" && grep -q "DO     install uig's crontab" "$(log repair)" || die "repair steps"
rm /home/uig/.pm2/dump.pm2
run --env staging >"$(log repair1)" 2>&1 || die "dump repair run failed"
grep -q 'DO     pm2 save, as uig' "$(log repair1)" && [ "$(changes "$(log repair1)")" = 1 ] || { grep -E "DO |changes|WARN|ERROR" "$(log repair1)"; die "dump.pm2 not re-saved"; }

run --env staging >"$(log repair2)" 2>&1 && [ "$(changes "$(log repair2)")" = 0 ] || die "not idempotent after repair"
before="$(snapshot)"
runuser -u nobody -- python3 -m http.server 4036 --bind 0.0.0.0 >/dev/null 2>&1 &
SQUAT=$!
sleep 1
run --env staging --mailpit-ui-port 4036 >"$(log taken)" 2>&1 && die "a taken port was accepted"
grep -q 'port 4036 (Mailpit UI) is taken by nobody' "$(log taken)" || die "taken port not named"
pkill -P "$SQUAT" || true
kill "$SQUAT" 2>/dev/null || true
run --env staging --min-free-gb 100000 >"$(log disk)" 2>&1 && die "the disk floor was ignored"
echo 'export LOCAL_PRODUCTION_BUILD=1' >>/home/uig/shared/.env
run --env staging >"$(log lpb)" 2>&1 && die "LOCAL_PRODUCTION_BUILD was accepted"
sed -i '/^export LOCAL_PRODUCTION_BUILD=1$/d' /home/uig/shared/.env
runuser -u postgres -- psql -Xqc "comment on role oei is null"
run --env staging >"$(log unmarked)" 2>&1 && die "an unmarked role was adopted"
grep -q "role oei exists and is not this script's" "$(log unmarked)" || die "unmarked role not named"
runuser -u postgres -- psql -Xqc "comment on role oei is 'indies-provision'"
run --env staging --production >/dev/null 2>&1 && die "unknown option accepted"
run --env production >"$(log prod)" 2>&1 && die "production without specs ran"
unchanged "$before" "a refused run changed the host"
pg_createcluster 18 second --port 5433 >/dev/null
before="$(snapshot)"
run --env staging >"$(log clusters)" 2>&1 && die "two clusters without --pg-port ran"
grep -q 'name the one to use with --pg-port' "$(log clusters)" || die "cluster choice not asked"
unchanged "$before" "the cluster refusal changed the host"
run --env staging --pg-port 5432 >"$(log pgport)" 2>&1 && [ "$(changes "$(log pgport)")" = 0 ] || die "--pg-port 5432 run"
pg_dropcluster 18 second

pass "a lost crontab block fails --report; lost block and dump.pm2 repaired, then 0; taken port, disk floor, export LOCAL_PRODUCTION_BUILD, an unmarked role, two clusters and a bare production run refused, host unchanged"

# 13. --verify-restart: each of this script's services comes back after its restart; it never
#     runs in a dry run; a unit that would not start at boot fails it.
run --env staging --verify-restart --dry-run >"$(log vr-dry)" 2>&1 && die "--verify-restart ran in a dry run"
grep -q 'never with --dry-run' "$(log vr-dry)" || die "--verify-restart's dry-run refusal not named"
pid_before="$(cat /home/uig/.pm2/pm2.pid)"
run --env staging --verify-restart >"$(log verify)" 2>&1 || { cat "$(log verify)"; die "--verify-restart failed"; }
grep -E '^   (PASS|FAIL) ' "$(log verify)"
grep -q '^   FAIL ' "$(log verify)" && die "a restart check failed"
for m in 'PASS   RustFS: indies-rustfs.service stopped and started: /health 200' \
  'PASS   pm2 uig: pm2-uig.service restarted; its pm2 resurrect brought uig back from dump.pm2' \
  'PASS   pm2 uoei: pm2-uoei.service restarted' 'PASS   Mailpit: indies-mailpit.service restarted; SMTP 127.0.0.1:4034 greets 220' \
  'PASS   cron: uig' 'PASS   cron: uoei' 'PASS   boot: pm2-uoei.service is enabled' \
  'PASS   boot: /var/lib/indies-rustfs/data is a plain directory, not a mount'; do
  grep -qF "$m" "$(log verify)" || die "--verify-restart did not show: $m"
done
[ "$(cat /home/uig/.pm2/pm2.pid)" != "$pid_before" ] && systemctl is-active --quiet pm2-uig.service || die "pm2 is not back under its unit"
[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4030/api/health)" = 503 ] || die "the app is not back"
run --env staging >"$(log after-verify)" 2>&1 && [ "$(changes "$(log after-verify)")" = 0 ] || die "--verify-restart left a change behind"
rm /run/shim/indies-db-backup.timer.enabled
run --env staging --verify-restart >"$(log verify-fail)" 2>&1 && die "a disabled unit passed --verify-restart"
grep -q 'FAIL   boot: indies-db-backup.timer is not enabled' "$(log verify-fail)" || die "the disabled unit not named"
run --env staging >"$(log reenable)" 2>&1 && [ "$(changes "$(log reenable)")" = 1 ] || die "the timer not re-enabled"
pass "--verify-restart: $(grep -c '^   PASS ' "$(log verify)") checks passed (pm2 back from dump.pm2 under its unit, RustFS, Mailpit, cron, boot); refused in a dry run; a disabled unit fails it"

# 14. --report's inventory names everything the script owns, and changes nothing.
before="$(snapshot)"
run --env staging --report >"$(log inventory)" 2>&1 || { cat "$(log inventory)"; die "--report failed"; }
unchanged "$before" "--report changed the host"
for m in 'user    present  uig (uid' 'user    present  indies-rustfs' 'unit    present  /etc/systemd/system/pm2-uoei.service (644 root:root' \
  'port    held     4030' 'port    free     4033' 'file    present  /etc/indies/rustfs/secret-key (640 root:indies-rustfs' \
  'pm2     host     /usr/bin/pm2 — pm2 7.0.1, the host' 'cron    present  uoei' \
  'db      present  ig_db (owner ig' 'bucket  present  archive-masters (private)' 'key     present  RustFS key uig-media' \
  'dir     present  /var/lib/indies-rustfs/data (700 indies-rustfs:indies-rustfs)'; do
  grep -qF "$m" "$(log inventory)" || die "the inventory does not show: $m"
done
pass "--report's inventory: $(sed -n '/^== inventory/,/^== report/p' "$(log inventory)" | grep -c '^   [a-z]') entries; host unchanged"
sed -i 's/"version":"7.0.1"/"version":"6.0.0"/' /usr/lib/node_modules/pm2/package.json
run --env staging --report >"$(log pm2-6)" 2>&1 || true
sed -i 's/"version":"6.0.0"/"version":"7.0.1"/' /usr/lib/node_modules/pm2/package.json
grep -q 'WARN   pm2 6.0.0 at /usr/bin/pm2, not 7.x as KOI and the poller run' "$(log pm2-6)" || die "a pm2 that is not 7.x was not warned about"
pass "a system pm2 that is not 7.x is a warning"

printf '\n--- the report of the converged run ---\n'
sed -n '/^== report: shared/,$p' "$(log apply4)" | grep -v '^          |'
echo
echo "ALL PASS"
