# shellcheck shell=bash
# Steps 1-6 of in-container.sh: the system pm2's trust, a first run on the old host names, the
# deploy poller's output in both homes, --replace-site refused and allowed, the new sites under
# the same users, and the poller's idle pm2 daemon adopted. Sourced; uses lib.sh's helpers.
# shellcheck disable=SC2015 # "check && check || die": die runs when any check fails, as meant

# poller USER BRAND — what gaiada-poll did on Helios once the site user existed: the production
# artifact under ~/releases/deploy_*, `current` at its brand dir, and `pm2 describe <user>`
# through /usr/bin/pm2, which starts an idle pm2 daemon.
POLLED=releases/deploy_production-20260930T075511Z-d2c5786
poller() {
  local r="/home/$1/$POLLED"
  runuser -u "$1" -- mkdir -p "$r/indies-gallery/engine" "$r/old-east-indies/engine"
  runuser -u "$1" -- sh -c "echo d2c5786 >'$r/$2/BUILD_ID'"
  runuser -u "$1" -- ln -sfn "$r/$2" "/home/$1/current"
  pm2_as "$1" describe "$1" >/dev/null 2>&1 || true
}
pm2_as() {
  local u="$1"
  shift
  runuser -u "$u" -- env -i HOME="/home/$u" PATH=/usr/bin:/bin /usr/bin/pm2 "$@"
}

# 1. The system pm2 (root:root 775, group root empty) is trusted; a member in group root makes
#    it untrusted, and the run refuses before any change. A dry run starts no pm2 daemon.
usermod -aG root nobody
before="$(snapshot)"
run --env staging "${OLD[@]}" >"$(log member)" 2>&1 && die "a pm2 writable by a member of group root was trusted"
grep -q 'ERROR  no trusted system node + pm2 for uig in /usr/bin or /usr/local/bin: /usr/bin/pm2 -> /usr/lib/node_modules/pm2/bin/pm2: /usr/lib/node_modules/pm2/bin/pm2 is writable by group root, whose members are nobody' "$(log member)" ||
  die "the group-root member not named"
unchanged "$before" "the untrusted-pm2 refusal changed the host"
gpasswd -d nobody root >/dev/null
before="$(snapshot)"
run --env staging "${OLD[@]}" --dry-run >"$(log dry1)" 2>&1 || true
unchanged "$before" "dry run changed the host"
[ ! -e /home/uig/.pm2 ] && [ ! -e /root/.pm2 ] || die "the dry run started a pm2 daemon"
grep -q 'WOULD  create role ig ' "$(log dry1)" || die "dry run does not plan the role"
grep -q 'ok     node 22.13.0 from /usr/bin, run as uig only' "$(log dry1)" &&
  grep -q 'ok     pm2 7.0.1 at /usr/bin/pm2 (the host' "$(log dry1)" || die "the system node and pm2 not trusted"
pass "group-0 775 pm2 trusted with no member, refused with one (host unchanged); dry run: $(changes "$(log dry1)") changes planned, no pm2 daemon"

# 2. The first run on the old host names, then the poller: its release in both homes, `current`
#    moved to it, an idle pm2 daemon. Our pm2 state is cleared as Helios had none of it.
run --env staging "${OLD[@]}" >"$(log first)" 2>&1 || { cat "$(log first)"; die "the first run failed"; }
for u in uig uoei; do
  pm2_as "$u" kill >/dev/null
  rm -rf "/home/$u/.pm2"
done
poller uig indies-gallery
poller uoei old-east-indies
[ "$(readlink /home/uig/current)" = "/home/uig/$POLLED/indies-gallery" ] && [ -S /home/uig/.pm2/rpc.sock ] || die "the poller's state"
pass "first run on ig./oei.gaiada.com, then the poller's release, current and idle pm2 daemon in both homes"

# 3. --replace-site refused: a file in the home, a filled secret, a process of the user's, an app
#    in the user's pm2, a site of another user's — each named, nothing changed, no clpctl call.
REPL=(--env staging --create-sites --replace-site ig.gaiada.com --replace-site oei.gaiada.com)
install -o uoei -g uoei -m 644 /dev/null /home/uoei/htdocs/oei.gaiada.com/app.js
sed -i 's/^CRON_SECRET=$/CRON_SECRET=a1b2c3/' /home/uig/shared/.env
runuser -u uoei -- sleep 600 &
printf 'setInterval(() => {}, 1e6)\n' >/tmp/idle.js
printf "module.exports = { apps: [{ name: 'x', script: '/tmp/idle.js', node_args: '--no-warnings', cwd: '/tmp', env: {}, exec_mode: 'fork', instances: 1 }] }\n" >/tmp/eco-x.cjs
chmod 644 /tmp/idle.js /tmp/eco-x.cjs
pm2_as uoei start /tmp/eco-x.cjs
sed 's/uig/someone/g; s/ig\.gaiada/other.gaiada/g' "$VH/ig.gaiada.com.conf" >"$VH/other.gaiada.com.conf"
sleep 1
before="$(snapshot)"
run "${REPL[@]}" --replace-site other.gaiada.com >"$(log refused)" 2>&1 && die "a refused replacement ran"
for m in 'oei.gaiada.com refused: the home holds htdocs/oei.gaiada.com/app.js' \
  'ig.gaiada.com refused: /home/uig/shared/.env has CRON_SECRET filled in' \
  'oei.gaiada.com refused: processes run as uoei:' 'oei.gaiada.com refused: the pm2 daemon for uoei has apps defined: x:online' \
  "other.gaiada.com refused: its vhost's site user is 'someone'" 'nothing was changed'; do
  grep -qF "$m" "$(log refused)" || die "not named: $m"
done
grep -q 'ig.gaiada.com refused: .*processes\|ig.gaiada.com refused: .*apps defined\|ig.gaiada.com refused: current' "$(log refused)" &&
  die "the poller's idle daemon or release was refused"
unchanged "$before" "a refused replacement changed the host"
[ ! -s /var/log/clpctl-shim.log ] || die "clpctl was called"
rm "$VH/other.gaiada.com.conf" /home/uoei/htdocs/oei.gaiada.com/app.js
sed -i 's/^CRON_SECRET=a1b2c3$/CRON_SECRET=/' /home/uig/shared/.env
pkill -u uoei sleep || true
pm2_as uoei kill >/dev/null
pm2_as uoei describe uoei >/dev/null 2>&1 || true
pass "--replace-site refused for a file in the home, a filled secret, a running process, an app in pm2, another user's site; the poller's release and idle daemon accepted; host unchanged"

# 3b. The poller starts something between the check and the delete: the re-check refuses.
touch /tmp/poller-race
run "${REPL[@]}" >"$(log race)" 2>&1 && die "the race was not caught"
grep -q 'ig.gaiada.com: changed since the check, so nothing is deleted: processes run as uig' "$(log race)" || die "the race not named"
[ -f "$VH/ig.gaiada.com.conf" ] && id -u uig >/dev/null && [ -d /home/uig/shared ] && [ ! -s /var/log/clpctl-shim.log ] ||
  die "something was deleted in the race"
rm /tmp/poller-race
pkill -u uig sleep || true
pkill -u uoei sleep || true
sleep 1
for u in uig uoei; do pm2_as "$u" describe "$u" >/dev/null 2>&1 || true; done
pass "the re-check right before clpctl site:delete refuses when the poller started something after the idle daemon was stopped; nothing deleted"

# 4. A dry run of the replacement prints what clpctl deletes and changes nothing.
before="$(snapshot)"
run "${REPL[@]}" --dry-run >"$(log replace-dry)" 2>&1 || { cat "$(log replace-dry)"; die "the replacement dry run failed"; }
unchanged "$before" "the replacement dry run changed the host"
for m in "WOULD  remove uig's crontab and run clpctl site:delete --domainName=ig.gaiada.com --force" \
  "WOULD  stop uig's idle pm2 daemon (pid" 'the vhost /etc/nginx/sites-enabled/ig.gaiada.com.conf (and reloads nginx)' \
  '| f shared/.env' '| l current' "| d $POLLED" '| d htdocs/ig.gaiada.com' 'it does not touch Postgres: ig_db and role ig stay' \
  'WOULD  add the CloudPanel Node.js site indies-gallery.gaiada.com (site user uig, app port 4030' \
  'WOULD  add the CloudPanel Node.js site old-east-indies.gaiada.com (site user uoei, app port 4031'; do
  grep -qF "$m" "$(log replace-dry)" || die "the dry run does not show: $m"
done
[ ! -s /var/log/clpctl-shim.log ] || die "clpctl was called in a dry run"
pass "replacement dry run: the home's listing, the idle daemon's stop and what clpctl removes printed; host unchanged"
sed -n '/^== gallery: replace/,/^== gallery: Postgres/p' "$(log replace-dry)" | sed '$d'

# 5. The replacement: old sites deleted (crontab, .env and vhost kept first), the new ones made
#    under the same users, running the system pm2.
run "${REPL[@]}" >"$(log replace)" 2>&1 || { cat "$(log replace)"; die "the replacement failed"; }
for d in ig.gaiada.com oei.gaiada.com; do
  grep -qx "site:delete --domainName=$d --force" /var/log/clpctl-shim.log || die "clpctl site:delete $d"
  [ ! -e "$VH/$d.conf" ] || die "$d's vhost is left"
  b="$(ls -td /var/backups/indies/config/replace-site/"$d".* | head -n 1)" # the newest: 3b's refused run kept one too
  [ -s "$b/shared.env" ] && grep -q indies-provision "$b/crontab" && [ -s "$b/vhost.conf" ] || die "$d's backup"
  [ "$(stat -c '%a %U' "$b")" = "700 root" ] || die "$d's backup is not root's alone"
done
grep -q "DO     stop uig's idle pm2 daemon" "$(log replace)" && grep -q 'ok     checked again right before the delete' "$(log replace)" ||
  die "the idle daemon stop or the re-check"
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
  grep -qx "ExecStart=/usr/bin/pm2 resurrect" "/etc/systemd/system/pm2-$u.service" &&
    grep -qx "Environment=PATH=/usr/bin:/usr/local/bin:/bin" "/etc/systemd/system/pm2-$u.service" || die "pm2-$u.service"
done
[ ! -s /tmp/npm-shim.log ] || die "npm was run: no pm2 may be installed"
[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4031/api/health)" = 503 ] || die "the holding server"
pass "replaced: idle daemons stopped, re-checked, old sites deleted after their backups, new sites under uig and uoei on /usr/bin/pm2, ig_db and oei_db kept, npm never run ($(changes "$(log replace)") changes)"

# 6. Again — plain, and with the same flags (the old sites are gone): nothing changes. Then the
#    poller's idle daemon in a provisioned home is adopted: the process starts in it, unkilled.
run --env staging >"$(log apply2)" 2>&1 || { cat "$(log apply2)"; die "second apply failed"; }
[ "$(changes "$(log apply2)")" = 0 ] || { grep -E 'DO  ' "$(log apply2)"; die "second apply changed things"; }
run "${REPL[@]}" >"$(log apply2r)" 2>&1 && [ "$(changes "$(log apply2r)")" = 0 ] || die "a repeated --replace-site changed things"
grep -q 'ok     ig.gaiada.com: no vhost at' "$(log apply2r)" || die "the gone site not reported"
pm2_as uig kill >/dev/null
pm2_as uig describe uig >/dev/null 2>&1 || true
idle="$(cat /home/uig/.pm2/pm2.pid)"
run --env staging >"$(log adopt)" 2>&1 || { cat "$(log adopt)"; die "the adopting apply failed"; }
grep -q 'DO     start pm2 process uig from ~/ecosystem.config.cjs in the pm2 daemon already running for uig (adopted' "$(log adopt)" &&
  [ "$(cat /home/uig/.pm2/pm2.pid)" = "$idle" ] || die "the poller's daemon was not adopted"
run --env staging >"$(log adopt2)" 2>&1 && [ "$(changes "$(log adopt2)")" = 0 ] || die "not idempotent after adopting"
pass "second apply: changes 0, with and without the --replace-site flags; the poller's idle daemon adopted (pid $idle kept), then 0"
