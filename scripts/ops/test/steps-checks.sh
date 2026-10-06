# shellcheck shell=bash
# Steps 9-15 of in-container.sh, after the secrets converged: the storage scopes (8.5's findings
# on one media bucket, one masters bucket and one key), Mailpit and the cron wrapper, the nightly
# dump and its off-box hook, drift and refusals, --verify-restart and --report's inventory.
# Sourced; uses lib.sh's helpers and in-container.sh's $V, $k1.
# shellcheck disable=SC2015 # "check && check || die": die runs when any check fails, as meant

# 9. The key and the buckets do what DEPLOYMENT.md §2 and §6 say, and only that.
sed -n '/^s3_py() {/,/^PY$/p' /ops/lib/s3admin.sh | sed '1,2d;$d' >/tmp/s3.py
as() { echo hi >/tmp/o; S3_AK="$1" S3_SK="$2" python3 /tmp/s3.py "$3" "http://127.0.0.1:4032/$4" "${5:-}" /tmp/out; }
root() { as "$(cat /etc/indies/rustfs/access-key)" "$(cat /etc/indies/rustfs/secret-key)" "$@"; }
anon() { curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:4032/$1"; }
for k in derivatives/a.txt iiif/a/info.json uploads/a.txt iiif-full/a/info.json; do
  [ "$(as "$U" "$k1" PUT "indies-media/$k" /tmp/o)" = 200 ] || die "the key cannot write indies-media/$k"
done
[ "$(anon indies-media/derivatives/a.txt)" = 200 ] && [ "$(anon indies-media/iiif/a/info.json)" = 200 ] || die "public read"
[ "$(anon indies-media/uploads/a.txt)" = 403 ] && [ "$(anon indies-media/iiif-full/a/info.json)" = 403 ] || die "uploads/ or iiif-full/ public"
[ "$(anon indies-media)" = 403 ] && [ "$(anon 'indies-media?list-type=2')" = 403 ] || die "anonymous listing of indies-media"
[ "$(as "$U" "$k1" PUT archive-masters/masters/m.tif /tmp/o)" = 200 ] || die "the key cannot write a capture"
[ "$(as "$U" "$k1" GET archive-masters/masters/m.tif)" = 200 ] || die "the key cannot read a master"
[ "$(as "$U" "$k1" DELETE archive-masters/masters/m.tif)" = 403 ] || die "the key deletes a master"
[ "$(as "$U" "$k1" PUT archive-masters/orders/o.pdf /tmp/o)" = 403 ] || die "the key writes outside masters/"
[ "$(anon archive-masters/masters/m.tif)" = 403 ] && [ "$(anon archive-masters)" = 403 ] || die "masters public or listed"
[ "$(root GET 'archive-masters?versioning')" = 200 ] && grep -q '<Status>Enabled</Status>' /tmp/out || die "masters not versioned"
[ "$(root GET 'archive-masters?cors')" = 200 ] && grep -q "<AllowedOrigin>https://$SHOP</AllowedOrigin>" /tmp/out ||
  die "masters CORS"
pass "one key: both buckets, writes captures, deletes no master; public only under derivatives/ and iiif/; no anonymous listing; masters private, versioned, CORS for https://$SHOP"

# 10. Mailpit needs its passwords; the cron wrapper logs a change once, accepts 409.
[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4035/api/v1/messages)" = 401 ] || die "Mailpit UI open"
python3 -c "import smtplib; smtplib.SMTP('127.0.0.1', 4034).sendmail('a@x.test', ['b@x.test'], 'Subject: n\n\nx')" 2>/dev/null && die "Mailpit SMTP took mail without a password"
SP="$(cat /etc/indies/mailpit/smtp-password)" python3 -c "import os, smtplib; s = smtplib.SMTP('127.0.0.1', 4034); s.login('indies-staging', os.environ['SP']); s.sendmail('no-reply@old-east-indies.gaiada.com', ['a@example.test'], 'Subject: t\n\nhi')"
curl -s -u "indies:$(cat /etc/indies/mailpit/ui-password)" http://127.0.0.1:4035/api/v1/messages | grep -q '"Subject":"t"' || die "Mailpit did not catch it"
runuser -u "$U" -- "/home/$U/bin/indies-cron" jobs 200,409 900 2>/tmp/cron1.err && die "a 503 counted as success"
runuser -u "$U" -- "/home/$U/bin/indies-cron" jobs 200,409 900 2>/tmp/cron2.err || true
grep -q 'answered 503' /tmp/cron1.err && [ ! -s /tmp/cron2.err ] || die "cron did not log once per change"
pkill -u "$U" -f 'engine/apps/web/server.js' || true
sleep 1
runuser -u "$U" -- node -e "require('http').createServer((q,r)=>{r.writeHead(q.url.startsWith('/api/health')?200:409);r.end('{}')}).listen(4030,'127.0.0.1')" &
FAKE=$!
sleep 1
runuser -u "$U" -- "/home/$U/bin/indies-cron" jobs 200,409 900 2>/tmp/cron3.err || die "409 busy counted as failure"
grep -q 'answers 409 again' /tmp/cron3.err || die "recovery not logged"
runuser -u "$U" -- "/home/$U/bin/indies-health" 5 1 >/dev/null || die "indies-health"
pkill -P "$FAKE" || true
kill "$FAKE" 2>/dev/null || true
pass "Mailpit UI and SMTP need their passwords; cron logs 503 once, then the recovery; 409 is success"

# 11. The nightly dump: indies_db alone, readable, root-only, handed to the off-box hook, whose
#     failure fails the run; a stale list is rewritten to the one database.
/usr/local/sbin/indies-db-backup || die "backup"
pg_restore --list /var/backups/indies/indies_db/indies_db-*.dump >/dev/null || die "the dump is not readable"
[ "$(find /var/backups/indies -name '*.dump' | wc -l)" = 1 ] || die "a dump of another database"
[ "$(stat -c '%a %U' /var/backups/indies/indies_db)" = '700 root' ] || die "the dump directory is not root's alone"
[ -z "$(find /var/backups/indies -name '*.dump' ! -perm 600)" ] && [ -z "$(find /var/backups/indies -name '*.partial')" ] ||
  die "a dump readable by others, or a half-written one"
printf '#!/bin/sh\necho "$1" >>/tmp/offbox.log\n' >/etc/indies/backup-offbox && chmod 700 /etc/indies/backup-offbox
/usr/local/sbin/indies-db-backup || die "backup with the off-box hook"
grep -q '^/var/backups/indies/indies_db/indies_db-[0-9TZ]*\.dump$' /tmp/offbox.log || die "the hook was not handed the dump"
printf '#!/bin/sh\nexit 1\n' >/etc/indies/backup-offbox
/usr/local/sbin/indies-db-backup 2>/tmp/offbox.err && die "a failing off-box copy passed"
grep -q 'the off-box copy of .* failed' /tmp/offbox.err || die "the off-box failure not said"
rm /etc/indies/backup-offbox
pass "indies-db-backup: indies_db alone, pg_restore reads it, 600 in a 700 root dir; the off-box hook gets each dump and its failure fails the run"

# 12. Drift the script must repair, and refusals that change nothing.
crontab -u "$U" -r
run --env staging --report >"$(log report)" 2>&1 && die "--report missed the lost crontab block"
grep -q "managed block is gone" "$(log report)" || die "lost block not named"
# (step 10 stopped the holding server: this run starts it again under pm2 and reinstalls the block)
run --env staging >"$(log repair)" 2>&1 || die "repair run failed"
grep -q "DO     start pm2 process $U" "$(log repair)" && grep -q "DO     install $U's crontab" "$(log repair)" || die "repair steps"
rm "/home/$U/.pm2/dump.pm2"
run --env staging >"$(log repair1)" 2>&1 || die "dump repair run failed"
grep -q "DO     pm2 save, as $U" "$(log repair1)" && [ "$(changes "$(log repair1)")" = 1 ] || { grep -E "DO |changes|WARN|ERROR" "$(log repair1)"; die "dump.pm2 not re-saved"; }
run --env staging >"$(log repair2)" 2>&1 && [ "$(changes "$(log repair2)")" = 0 ] || die "not idempotent after repair"
printf 'ig_db\nindies_db\n' >/etc/indies/backup-databases
run --env staging >"$(log backup-list)" 2>&1 && [ "$(changes "$(log backup-list)")" = 1 ] &&
  [ "$(cat /etc/indies/backup-databases)" = indies_db ] || die "a stale backup list (the two-app databases) was not rewritten"
before="$(snapshot)"
runuser -u nobody -- python3 -m http.server 4036 --bind 0.0.0.0 >/dev/null 2>&1 &
SQUAT=$!
sleep 1
run --env staging --mailpit-ui-port 4036 >"$(log taken)" 2>&1 && die "a taken port was accepted"
grep -q 'port 4036 (Mailpit UI) is taken by nobody' "$(log taken)" || die "taken port not named"
pkill -P "$SQUAT" || true
kill "$SQUAT" 2>/dev/null || true
run --env staging --min-free-gb 100000 >"$(log disk)" 2>&1 && die "the disk floor was ignored"
echo 'export LOCAL_PRODUCTION_BUILD=1' >>"$V"
run --env staging >"$(log lpb)" 2>&1 && die "LOCAL_PRODUCTION_BUILD was accepted"
sed -i '/^export LOCAL_PRODUCTION_BUILD=1$/d' "$V"
runuser -u postgres -- psql -Xqc "comment on role indies is null"
run --env staging >"$(log unmarked)" 2>&1 && die "an unmarked role was adopted"
grep -q "role indies exists and is not this script's" "$(log unmarked)" || die "unmarked role not named"
runuser -u postgres -- psql -Xqc "comment on role indies is 'indies-provision'"
P=(--site uprod:4040:prod_db:prod --shop-hosts oldeastindies.com --gallery-hosts antiquemapsindonesia.com)
for refusal in "--env staging --production|unknown option" "--env production|production needs --site" \
  "--env production ${P[*]}|production needs --bucket-suffix" \
  "--env production --site uprod:4040:prod_db:prod --shop-hosts $SHOP --gallery-hosts antiquemapsindonesia.com --bucket-suffix -live|is a staging host name" \
  "--env staging --only web|--only is gone" "--env staging --gallery uig:4030:ig_db:ig:$GALLERY|--gallery is gone" \
  "--env staging --gallery-hosts $SHOP|is named twice" "--env staging --site uindies:4030:indies_db|four fields"; do
  # shellcheck disable=SC2086 # the options are words
  run ${refusal%%|*} >"$(log refusal)" 2>&1 && die "accepted: ${refusal%%|*}"
  grep -qF -- "${refusal#*|}" "$(log refusal)" || die "'${refusal%%|*}' was not refused with: ${refusal#*|}"
done
unchanged "$before" "a refused run changed the host"
pg_createcluster 18 second --port 5433 >/dev/null
before="$(snapshot)"
run --env staging >"$(log clusters)" 2>&1 && die "two clusters without --pg-port ran"
grep -q 'name the one to use with --pg-port' "$(log clusters)" || die "cluster choice not asked"
unchanged "$before" "the cluster refusal changed the host"
run --env staging --pg-port 5432 >"$(log pgport)" 2>&1 && [ "$(changes "$(log pgport)")" = 0 ] || die "--pg-port 5432 run"
pg_dropcluster 18 second
pass "lost crontab block, dump.pm2 and a stale backup list repaired, then 0; taken port, disk floor, LOCAL_PRODUCTION_BUILD, an unmarked role, the two-app options, production without its specs or suffix or on a staging host, a host twice, two clusters — each refused, host unchanged"

# 13. --verify-restart: each of this script's services comes back after its restart; it never
#     runs in a dry run; a unit that would not start at boot fails it.
run --env staging --verify-restart --dry-run >"$(log vr-dry)" 2>&1 && die "--verify-restart ran in a dry run"
grep -q 'never with --dry-run' "$(log vr-dry)" || die "--verify-restart's dry-run refusal not named"
pid_before="$(cat "/home/$U/.pm2/pm2.pid")"
run --env staging --verify-restart >"$(log verify)" 2>&1 || { cat "$(log verify)"; die "--verify-restart failed"; }
grep -E '^   (PASS|FAIL) ' "$(log verify)"
grep -q '^   FAIL ' "$(log verify)" && die "a restart check failed"
for m in 'PASS   RustFS: indies-rustfs.service stopped and started: /health 200' \
  "PASS   pm2 $U: pm2-$U.service restarted; its pm2 resurrect brought $U back from dump.pm2" \
  'PASS   Mailpit: indies-mailpit.service restarted; SMTP 127.0.0.1:4034 greets 220' \
  "PASS   cron: $U" "PASS   boot: pm2-$U.service is enabled" 'PASS   boot: indies-db-backup.timer is enabled' \
  'PASS   boot: /var/lib/indies-rustfs/data is a plain directory, not a mount'; do
  grep -qF "$m" "$(log verify)" || die "--verify-restart did not show: $m"
done
[ "$(cat "/home/$U/.pm2/pm2.pid")" != "$pid_before" ] && systemctl is-active --quiet "pm2-$U.service" || die "pm2 is not back under its unit"
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
for m in "user    present  $U (uid" 'user    present  indies-rustfs' "unit    present  /etc/systemd/system/pm2-$U.service (644 root:root" \
  'port    held     4030' 'port    free     4033' 'file    present  /etc/indies/rustfs/secret-key (640 root:indies-rustfs' \
  'pm2     host     /usr/bin/pm2 — pm2 7.0.1, the host' "cron    present  $U" \
  'db      present  indies_db (owner indies' 'bucket  present  archive-masters (private, versioned)' \
  'bucket  present  indies-media' 'policy  present  RustFS policy indies-app' "key     present  RustFS key $U" \
  'dir     present  /var/lib/indies-rustfs/data (700 indies-rustfs:indies-rustfs)'; do
  grep -qF "$m" "$(log inventory)" || die "the inventory does not show: $m"
done
pass "--report's inventory: $(sed -n '/^== inventory/,/^== report/p' "$(log inventory)" | grep -c '^   [a-z]') entries; host unchanged"

# 15. A system pm2 that is not 7.x is a warning.
sed -i 's/"version":"7.0.1"/"version":"6.0.0"/' /usr/lib/node_modules/pm2/package.json
run --env staging --report >"$(log pm2-6)" 2>&1 || true
sed -i 's/"version":"6.0.0"/"version":"7.0.1"/' /usr/lib/node_modules/pm2/package.json
grep -q 'WARN   pm2 6.0.0 at /usr/bin/pm2, not 7.x as KOI and the poller run' "$(log pm2-6)" || die "a pm2 that is not 7.x was not warned about"
pass "a system pm2 that is not 7.x is a warning"
