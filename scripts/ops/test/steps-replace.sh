# shellcheck shell=bash
# Steps 1-5 of in-container.sh: Helios's first run replayed on the old host names, then
# --replace-site refused and allowed, and the new sites provisioned under the same users with pm2
# installed into each user's own nvm tree. Sourced; uses lib.sh's helpers.
# shellcheck disable=SC2015 # "check && check || die": die runs when any check fails, as meant

# 1. A dry run of the first run changes nothing (no pm2 daemon either) and names why the host's
#    pm2 is refused.
before="$(snapshot)"
run --env staging "${OLD[@]}" --dry-run >"$(log dry1)" 2>&1 || true
unchanged "$before" "dry run changed the host"
[ ! -e /home/uig/.pm2 ] && [ ! -e /root/.pm2 ] || die "the dry run started a pm2 daemon"
grep -q 'WOULD  create role ig ' "$(log dry1)" || die "dry run does not plan the role"
grep -q "WOULD  install pm2@6.0.14 into /home/uig/.nvm/versions/node/$NVM with /home/uig/.nvm/versions/node/$NVM/bin/npm, as uig" "$(log dry1)" ||
  die "dry run does not plan the pm2 install"
grep -q '/usr/bin/pm2 -> /usr/lib/node_modules/pm2/bin/pm2 (root 775, in a dir root 775) is not root-only' "$(log dry1)" ||
  die "the group-writable global pm2 is not named"
pass "dry run: $(changes "$(log dry1)") changes planned, host unchanged, no pm2 daemon; the 775 global pm2 named"

# 2. Helios's first run, replayed: npm cannot reach its registry, so there is no pm2 — the run
#    makes everything else and exits 1, as it did on 2026-10-01.
touch /tmp/npm-offline
run --env staging "${OLD[@]}" >"$(log helios)" 2>&1 && die "the replayed first run passed"
rm /tmp/npm-offline
grep -q 'ERROR  no trusted pm2 for uoei: the pm2 steps are skipped' "$(log helios)" || die "pm2 failure not named"
[ ! -e /etc/systemd/system/pm2-uig.service ] && [ ! -e /home/uig/.pm2 ] || die "pm2 steps ran"
[ -f /home/uig/shared/.env ] && [ -L /home/uig/current ] && crontab -u uig -l | grep -q indies-provision ||
  die "the replay did not make the rest"
grep -q '^uid=0 ' /tmp/npm-shim.log && die "npm ran as root"
pass "Helios's first run replayed: exit 1, no pm2 for uig or uoei, everything else made"

# 3. --replace-site refused: a file in the home, a filled secret, a process of the user's, and a
#    site of another user's — each named, nothing changed, clpctl never called.
REPL=(--env staging --create-sites --replace-site ig.gaiada.com --replace-site oei.gaiada.com)
install -o uoei -g uoei -m 644 /dev/null /home/uoei/htdocs/oei.gaiada.com/app.js
sed -i 's/^CRON_SECRET=$/CRON_SECRET=a1b2c3/' /home/uig/shared/.env
runuser -u uoei -- sleep 600 &
sed 's/uig/someone/g; s/ig\.gaiada/other.gaiada/g' "$VH/ig.gaiada.com.conf" >"$VH/other.gaiada.com.conf"
before="$(snapshot)"
run "${REPL[@]}" --replace-site other.gaiada.com >"$(log refused)" 2>&1 && die "a refused replacement ran"
for m in 'oei.gaiada.com refused: the home holds htdocs/oei.gaiada.com/app.js' \
  'ig.gaiada.com refused: /home/uig/shared/.env has CRON_SECRET filled in' \
  'oei.gaiada.com refused: processes run as uoei' \
  "other.gaiada.com refused: its vhost's site user is 'someone'" 'nothing was changed'; do
  grep -qF "$m" "$(log refused)" || die "not named: $m"
done
unchanged "$before" "a refused replacement changed the host"
[ ! -s /var/log/clpctl-shim.log ] || die "clpctl was called"
rm "$VH/other.gaiada.com.conf" /home/uoei/htdocs/oei.gaiada.com/app.js
sed -i 's/^CRON_SECRET=a1b2c3$/CRON_SECRET=/' /home/uig/shared/.env
pkill -u uoei sleep || true
pass "--replace-site refused for a file in the home, a filled secret, a running process, another user's site; host unchanged, clpctl not called"

# 4. A dry run of the replacement prints what clpctl deletes and changes nothing.
sleep 1
before="$(snapshot)"
run "${REPL[@]}" --dry-run >"$(log replace-dry)" 2>&1 || { cat "$(log replace-dry)"; die "the replacement dry run failed"; }
unchanged "$before" "the replacement dry run changed the host"
for m in "WOULD  remove uig's crontab and run clpctl site:delete --domainName=ig.gaiada.com --force" \
  'the vhost /etc/nginx/sites-enabled/ig.gaiada.com.conf (and reloads nginx)' '| f shared/.env' '| l current' \
  '| d htdocs/ig.gaiada.com' 'it does not touch Postgres: ig_db and role ig stay' \
  'WOULD  add the CloudPanel Node.js site indies-gallery.gaiada.com (site user uig, app port 4030' \
  'WOULD  add the CloudPanel Node.js site old-east-indies.gaiada.com (site user uoei, app port 4031'; do
  grep -qF "$m" "$(log replace-dry)" || die "the dry run does not show: $m"
done
[ ! -s /var/log/clpctl-shim.log ] || die "clpctl was called in a dry run"
pass "replacement dry run: the home's listing and what clpctl removes printed; host unchanged"
sed -n '/^== gallery: replace/,/^== gallery: Postgres/p' "$(log replace-dry)" | sed '$d'

# 5. The replacement: old sites deleted (crontab, .env and vhost kept first), the new ones made
#    under the same users, pm2 6.0.14 installed into each user's nvm tree by that user.
run "${REPL[@]}" >"$(log replace)" 2>&1 || { cat "$(log replace)"; die "the replacement failed"; }
for d in ig.gaiada.com oei.gaiada.com; do
  grep -qx "site:delete --domainName=$d --force" /var/log/clpctl-shim.log || die "clpctl site:delete $d"
  [ ! -e "$VH/$d.conf" ] || die "$d's vhost is left"
  b="$(ls -d /var/backups/indies/config/replace-site/"$d".*)"
  [ -s "$b/shared.env" ] && grep -q indies-provision "$b/crontab" && [ -s "$b/vhost.conf" ] || die "$d's backup"
  [ "$(stat -c '%a %U' "$b")" = "700 root" ] || die "$d's backup is not root's alone"
done
grep -q '^SITE_URL=https://ig.gaiada.com$' /var/backups/indies/config/replace-site/ig.gaiada.com.*/shared.env || die "the old .env kept"
grep -q 'site:add:nodejs --domainName=indies-gallery.gaiada.com --nodejsVersion=22 --appPort=4030 --siteUser=uig ' /var/log/clpctl-shim.log &&
  grep -q 'site:add:nodejs --domainName=old-east-indies.gaiada.com --nodejsVersion=22 --appPort=4031 --siteUser=uoei ' /var/log/clpctl-shim.log ||
  die "the new sites"
grep -q '^SITE_URL=https://indies-gallery.gaiada.com$' /home/uig/shared/.env &&
  grep -q '^SITE_URL=https://old-east-indies.gaiada.com$' /home/uoei/shared/.env || die "the new .env"
[ "$(runuser -u postgres -- psql -XAtc "select string_agg(datname || ':' || pg_get_userbyid(datdba), ',' order by datname) from pg_database where datname in ('ig_db', 'oei_db')")" = 'ig_db:ig,oei_db:oei' ] ||
  die "a Postgres database did not survive"
grep -q 'ok     Postgres ig_db (owner ig) survived' "$(log replace)" || die "survival not checked"
for u in uig uoei; do
  grep -q "^uid=$(id -u "$u") user=$u args=install --global --prefix /home/$u/.nvm/versions/node/$NVM --ignore-scripts .* pm2@6.0.14$" /tmp/npm-shim.log ||
    die "npm did not run as $u"
  [ "$(stat -c %U "/home/$u/.nvm/versions/node/$NVM/lib/node_modules/pm2/bin/pm2")" = "$u" ] || die "$u's pm2 owner"
  grep -q "ok     pm2 6.0.14 at /home/$u/.nvm/versions/node/$NVM/bin/pm2 (pinned 6.0.14)" "$(log replace)" || die "$u's pm2 version check"
  grep -qx "ExecStart=/home/$u/.nvm/versions/node/$NVM/bin/pm2 resurrect" "/etc/systemd/system/pm2-$u.service" || die "pm2-$u.service"
done
grep -q '^uid=0 ' /tmp/npm-shim.log && die "npm ran as root"
[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4031/api/health)" = 503 ] || die "the holding server"
pass "replaced: both old sites deleted after their backups, new sites under uig and uoei, ig_db and oei_db kept, pm2 6.0.14 installed by each user into its nvm ($(changes "$(log replace)") changes)"

# 6. Again — plain, and with the same flags (the old sites are gone): nothing changes.
run --env staging >"$(log apply2)" 2>&1 || { cat "$(log apply2)"; die "second apply failed"; }
[ "$(changes "$(log apply2)")" = 0 ] || { grep -E 'DO  ' "$(log apply2)"; die "second apply changed things"; }
run "${REPL[@]}" >"$(log apply2r)" 2>&1 && [ "$(changes "$(log apply2r)")" = 0 ] || die "a repeated --replace-site changed things"
grep -q 'ok     ig.gaiada.com: no vhost at' "$(log apply2r)" || die "the gone site not reported"
pass "second apply: changes 0, with and without the --replace-site flags"
