#!/usr/bin/env bash
# The scenario container-test.sh runs inside the stand-in host. Each step prints PASS or stops.
# shellcheck disable=SC2015 # "check && check || die": die runs when any check fails, as meant
set -euo pipefail

pg_ctlcluster "$(ls /etc/postgresql)" main start
install -d /var/cache/indies && cp /seed/* /var/cache/indies/
bash /ops/pack.sh >/tmp/provision.sh 2>/tmp/pack.log
cat /tmp/pack.log

run() { bash -s -- "$@" </tmp/provision.sh; }
pass() { printf '\nPASS  %s\n' "$*"; }
die() {
  printf '\nFAIL  %s\n' "$*"
  exit 1
}
changes() { sed -n 's/^   changes: \([0-9]*\).*/\1/p' "$1"; }
snapshot() {
  {
    find /etc/indies /etc/systemd/system /etc/logrotate.d /home /opt/indies /usr/local/sbin \
      /var/backups/indies /var/lib/indies-rustfs /var/lib/indies-mailpit -type f 2>/dev/null |
      grep -vE '/\.pm2/|/\.pm2shim\.json$|/\.indies/|/var/lib/indies-rustfs/data/|mailpit\.db' |
      sort | xargs -r sha256sum
    find /home /etc/indies /opt/indies -printf '%p %m %u:%g %l\n' 2>/dev/null | grep -vE '/\.pm2|/\.indies' | sort
    runuser -u postgres -- psql -XAtc "select rolname, rolcreatedb, rolcanlogin, rolpassword is not null from pg_authid order by 1"
    runuser -u postgres -- psql -XAtc "select datname, datacl from pg_database order by 1"
    for u in uig uoei; do crontab -u "$u" -l 2>/dev/null || true; done
  } | sha256sum
}
log() { printf '/tmp/run-%s.log' "$1"; }

# 1. A dry run on the empty host prints the plan and changes nothing.
before="$(snapshot)"
run --env staging --dry-run >"$(log dry1)" 2>&1 || true
[ "$before" = "$(snapshot)" ] || die "dry run changed the host"
grep -q 'WOULD  create role ig ' "$(log dry1)" || die "dry run does not plan the role"
[ "$(changes "$(log dry1)")" -gt 20 ] || die "dry run planned too little"
pass "dry run: $(changes "$(log dry1)") changes planned, host unchanged"

# 2. Apply, then apply again: the second changes nothing.
run --env staging >"$(log apply1)" 2>&1 || { cat "$(log apply1)"; die "first apply failed"; }
pass "first apply: $(changes "$(log apply1)") changes"
run --env staging >"$(log apply2)" 2>&1 || { cat "$(log apply2)"; die "second apply failed"; }
[ "$(changes "$(log apply2)")" = 0 ] || { grep -E 'DO  ' "$(log apply2)"; die "second apply changed things"; }
pass "second apply: changes 0"

# 3. What the first apply built.
runuser -u postgres -- psql -XAtc "select rolcreatedb from pg_roles where rolname in ('ig','oei')" | grep -qv f && die "a role has CREATEDB"
ss -Hltn | awk '{print $4}' | grep -E ':(4030|4031|4032|4034|4035)$' | sort | tee /tmp/listen
grep -vq '^127\.0\.0\.1:' /tmp/listen && die "something listens beyond loopback"
[ "$(wc -l </tmp/listen)" = 5 ] || die "expected 5 loopback listeners"
[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4030/api/health)" = 503 ] || die "holding server"
grep -q "exec_mode: 'fork'" /home/uig/ecosystem.config.cjs && grep -q "HOSTNAME: 'localhost'" /home/uig/ecosystem.config.cjs &&
  grep -q -- "--dns-result-order=ipv4first" /home/uig/ecosystem.config.cjs || die "ecosystem"
grep -q '^\* \* \* \* \* /home/uig/bin/indies-cron jobs 200,409 900$' <(crontab -u uig -l) || die "jobs cron line"
grep -q '^# off until 18.1.d' <(crontab -u uig -l) || die "sweeps line not held off"
grep -q '^SITE_URL=https://ig.gaiada.com$' /home/uig/shared/.env && grep -q '^REVALIDATE_ORIGIN=http://127.0.0.1:4031$' /home/uoei/shared/.env &&
  ! grep -q LOCAL_PRODUCTION_BUILD= /home/uig/shared/.env && ! grep -q '^SISTER_BASE_URL' /home/uig/shared/.env || die ".env skeleton"
[ "$(stat -c '%a %U' /home/uig/shared/.env)" = "600 uig" ] || die ".env mode"
pass "roles NOCREATEDB, 5 listeners on 127.0.0.1 only, holding 503, fork/ipv4first/localhost, cron, .env"

# 4. Secrets from "Infisical": the next run converges Postgres and RustFS to them, then rests.
fill() { sed -i "s|^$2=.*|$2=$3|" "/home/$1/shared/.env"; }
dbpw="$(openssl rand -hex 20)"
sed -i "s|^DATABASE_URL=postgres://ig:@|DATABASE_URL=postgres://ig:$dbpw@|" /home/uig/shared/.env
k1="$(openssl rand -hex 20)" k2="$(openssl rand -hex 20)" k3="$(openssl rand -hex 20)" k4="$(openssl rand -hex 20)"
fill uig S3_SECRET_ACCESS_KEY "$k1"
fill uig MASTERS_SECRET_ACCESS_KEY "$k2"
fill uoei S3_SECRET_ACCESS_KEY "$k3"
fill uoei MASTERS_SECRET_ACCESS_KEY "$k4"
fill uig CRON_SECRET "$(openssl rand -hex 20)"
run --env staging --dry-run >"$(log dry2)" 2>&1 || true
grep -q "WOULD  set role ig's password" "$(log dry2)" || die "dry run does not plan the password"
run --env staging >"$(log apply3)" 2>&1 || { cat "$(log apply3)"; die "apply with secrets failed"; }
run --env staging >"$(log apply4)" 2>&1 || die "apply after secrets failed"
[ "$(changes "$(log apply4)")" = 0 ] || die "not idempotent after the secrets"
PGPASSWORD="$dbpw" psql -XAt -h 127.0.0.1 -U ig -d ig_db -c 'select 1' >/dev/null || die "ig cannot log in"
PGPASSWORD="$dbpw" psql -XAt -h 127.0.0.1 -U ig -d oei_db -c 'select 1' >/dev/null 2>&1 && die "ig opened oei_db"
grep -rq "$dbpw" /tmp/run-*.log && die "a log carries the password"
pass "secrets converged ($(changes "$(log apply3)") changes), then 0; ig cannot open oei_db; no secret in any log"

# 5. The keys do what DEPLOYMENT.md §2 says, and only that.
sed -n '/^s3_py() {/,/^PY$/p' /ops/lib/s3admin.sh | sed '1,2d;$d' >/tmp/s3.py
as() { echo hi >/tmp/o; S3_AK="$1" S3_SK="$2" python3 /tmp/s3.py "$3" "http://127.0.0.1:4032/$4" "${5:-}" /tmp/out; }
[ "$(as uig-media "$k1" PUT ig-media/a.txt /tmp/o)" = 200 ] || die "uig-media cannot write ig-media"
[ "$(as uig-media "$k1" PUT oei-media/a.txt /tmp/o)" = 403 ] || die "uig-media writes oei-media"
[ "$(as uoei-masters "$k4" PUT archive-masters/print-files/p.tif /tmp/o)" = 200 ] || die "uoei-masters print-files"
[ "$(as uoei-masters "$k4" PUT archive-masters/scans/s.tif /tmp/o)" = 403 ] || die "uoei-masters writes scans"
[ "$(as uig-masters "$k2" PUT archive-masters/scans/s.tif /tmp/o)" = 200 ] || die "uig-masters cannot write"
[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4032/ig-media/a.txt)" = 200 ] || die "public read"
[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4032/ig-media)" = 403 ] || die "anonymous listing"
[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4032/archive-masters/scans/s.tif)" = 403 ] || die "masters public"
pass "keys scoped: media own bucket only, OEI masters print-files/ only, public read without listing, masters private"

# 6. Mailpit catches mail; the cron wrapper accepts 200/409 and reports anything else.
python3 -c "import smtplib; smtplib.SMTP('127.0.0.1', 4034).sendmail('no-reply@ig.gaiada.com', ['a@example.test'], 'Subject: t\n\nhi')"
curl -s http://127.0.0.1:4035/api/v1/messages | grep -q '"Subject":"t"' || die "Mailpit did not catch it"
runuser -u uig -- /home/uig/bin/indies-cron jobs 200,409 900 2>/tmp/cron.err && die "a 503 counted as success"
grep -q 'answered 503' /tmp/cron.err || die "cron failure not reported"
pkill -u uig -f 'engine/apps/gallery/server.js' || true
sleep 1
fake() {
  runuser -u uig -- node -e "require('http').createServer((q,r)=>{r.writeHead(q.url.startsWith('/api/health')?200:$1);r.end('{}')}).listen(4030,'127.0.0.1')" &
  FAKE=$!
  sleep 1
}
fake 409
runuser -u uig -- /home/uig/bin/indies-cron jobs 200,409 900 || die "409 busy counted as failure"
runuser -u uig -- /home/uig/bin/indies-health 5 1 >/dev/null || die "indies-health"
pkill -P "$FAKE" || true; kill "$FAKE" 2>/dev/null || true
pass "Mailpit caught the mail; cron: 503 reported, 409 success; indies-health waits for 200"

# 7. The nightly dump restores.
/usr/local/sbin/indies-db-backup || die "backup"
for db in ig_db oei_db; do pg_restore --list /var/backups/indies/$db/*.dump >/dev/null || die "$db dump"; done
pass "indies-db-backup: both dumps readable by pg_restore"

# 8. Refusals stop before the first change.
before="$(snapshot)"
runuser -u nobody -- python3 -m http.server 4036 --bind 0.0.0.0 >/dev/null 2>&1 &
SQUAT=$!
sleep 1
run --env staging --mailpit-ui-port 4036 >"$(log taken)" 2>&1 && die "a taken port was accepted"
grep -q 'port 4036 (Mailpit UI) is taken by nobody' "$(log taken)" || die "taken port not named"
pkill -P "$SQUAT" || true; kill "$SQUAT" 2>/dev/null || true
run --env staging --min-free-gb 100000 >"$(log disk)" 2>&1 && die "the disk floor was ignored"
grep -q 'below the floor of 100000 GiB' "$(log disk)" || die "disk floor not named"
echo 'LOCAL_PRODUCTION_BUILD=1' >>/home/uig/shared/.env
run --env staging >"$(log lpb)" 2>&1 && die "LOCAL_PRODUCTION_BUILD was accepted"
sed -i '/^LOCAL_PRODUCTION_BUILD=1$/d' /home/uig/shared/.env
run --env production >"$(log prod)" 2>&1 && die "production without specs ran"
grep -q 'production needs --gallery and --emporium' "$(log prod)" || die "production refusal"
[ "$before" = "$(snapshot)" ] || die "a refused run changed the host"
pass "taken port, disk floor, LOCAL_PRODUCTION_BUILD and a bare production run all refused, host unchanged"

printf '\n--- the report of the converged run ---\n'
sed -n '/^== report: shared/,$p' "$(log apply4)" | grep -v '^          |'
echo
echo "ALL PASS"
