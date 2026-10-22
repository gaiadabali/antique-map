# shellcheck shell=bash
# Steps 1-6 of in-container.sh: the one site made with --create-sites on a host with no Indies
# site (as Helios is once the two-app shape is retired), idempotency, the second hostname in
# server_name, another vhost holding one of our hosts, planted symlinks, the system pm2's trust,
# and the deploy poller's idle pm2 daemon adopted. Sourced; uses lib.sh's helpers.
# shellcheck disable=SC2015 # "check && check || die": die runs when any check fails, as meant

# 1. A dry run on the empty host plans the site, the database and the buckets, and changes
#    nothing: no clpctl call, no pm2 daemon.
before="$(snapshot)"
run --env staging --create-sites --dry-run >"$(log dry1)" 2>&1 || true
unchanged "$before" "dry run changed the host"
[ ! -s /var/log/clpctl-shim.log ] || die "clpctl was called in a dry run"
[ ! -e /root/.pm2 ] || die "the dry run started a pm2 daemon"
for m in "WOULD  add the CloudPanel Node.js site $SHOP (site user $U, app port 4030" \
  'WOULD  create role indies (LOGIN only, CONNECTION LIMIT 20' 'WOULD  create bucket indies-media' \
  'WOULD  create bucket archive-masters' 'WOULD  enable versioning on bucket archive-masters' \
  "note   $U does not exist yet"; do
  grep -qF "$m" "$(log dry1)" || die "the dry run does not show: $m"
done
pass "dry run on an empty host: $(changes "$(log dry1)") changes planned (the site, indies_db, indies-media, archive-masters); host unchanged"

# 2. The first run makes the CloudPanel site, then everything inside it.
run --env staging --create-sites >"$(log first)" 2>&1 || { cat "$(log first)"; die "the first run failed"; }
grep -q "site:add:nodejs --domainName=$SHOP --nodejsVersion=22 --appPort=4030 --siteUser=$U " /var/log/clpctl-shim.log ||
  die "the CloudPanel site"
[ "$(grep -c '^site:add' /var/log/clpctl-shim.log)" = 1 ] || die "more than one CloudPanel site"
[ ! -s /tmp/npm-shim.log ] || die "npm was run: no pm2 may be installed"
pass "first run: one CloudPanel site $SHOP under $U, port 4030 ($(changes "$(log first)") changes)"

# 3. Again: nothing changes, and the missing gallery host in server_name is a warning, until the
#    vhost editor adds it (simulated here, as CloudPanel's editor does it on Helios).
run --env staging >"$(log apply2)" 2>&1 || { cat "$(log apply2)"; die "second apply failed"; }
[ "$(changes "$(log apply2)")" = 0 ] || { grep -E 'DO  ' "$(log apply2)"; die "second apply changed things"; }
grep -qF "WARN   vhost $CONF: server_name lacks $GALLERY" "$(log apply2)" || die "the missing server_name not warned"
grep -qF "server_name $SHOP $GALLERY;" "$(log apply2)" || die "the report does not print the server_name line"
sed -i "s/^\( *server_name\) $SHOP;/\1 $SHOP $GALLERY;/" "$CONF"
sed -i 's|^\( *\)location / {|\1location ^~ /_media/ {\n\1  proxy_pass http://127.0.0.1:4032/indies-media/;\n\1}\n\1location / {|' "$CONF"
run --env staging >"$(log apply3)" 2>&1 && [ "$(changes "$(log apply3)")" = 0 ] || die "the run after the vhost edit"
grep -q 'server_name lacks' "$(log apply3)" && die "server_name still warned after the edit"
grep -qF "ok     vhost $CONF: server_name names every host ($SHOP $GALLERY)" "$(log apply3)" &&
  grep -qF 'ok     vhost serves /_media/ (MEDIA_PUBLIC_URL=https://old-east-indies.gaiada.com/_media)' "$(log apply3)" ||
  die "the vhost checks after the edit"
pass "second run: changes 0; server_name without $GALLERY warned with the line to add, then ok; /_media/ seen"

# 4. Another vhost answering one of our hosts (an old site not yet retired) refuses the run.
printf 'server {\n  server_name %s;\n  root /home/someone/htdocs/x;\n  location / {\n    proxy_pass http://127.0.0.1:4999;\n  }\n}\n' \
  "$GALLERY" >"$VH/$GALLERY.conf"
before="$(snapshot)"
run --env staging >"$(log stale)" 2>&1 && die "a stale vhost holding $GALLERY was accepted"
grep -qF "$GALLERY is a server_name of another vhost: $VH/$GALLERY.conf" "$(log stale)" || die "the stale vhost not named"
unchanged "$before" "the stale-vhost refusal changed the host"
rm "$VH/$GALLERY.conf"
pass "another vhost serving $GALLERY refuses the run; host unchanged"

# 5. Review B1: symlinks planted in the home are each refused, a dry run prints no root-only
#    byte, and nothing anywhere changes.
printf 'TOPSECRET-ROOT-ONLY\n' >/root/secret.txt && chmod 600 /root/secret.txt
install -d -m 700 /etc/victim-dir /root/pm2victim && echo victim >/etc/victim-file
pm2_as "$U" kill >/dev/null
install -d -m 700 /tmp/keep
H="/home/$U"
mv "$H/shared/.env" /tmp/keep/env && ln -s /root/secret.txt "$H/shared/.env"
mv "$H/ecosystem.config.cjs" /tmp/keep/eco && ln -s /etc/victim-file "$H/ecosystem.config.cjs"
mv "$H/.pm2" /tmp/keep/pm2 && ln -s /root/pm2victim "$H/.pm2"
mv "$H/bin" /tmp/keep/bin && ln -s /etc/victim-dir "$H/bin"
mv "$H/.indies" /tmp/keep/indies && ln -s /etc/cron.d "$H/.indies"
chown -h "$U:$U" "$H/shared/.env" "$H/ecosystem.config.cjs" "$H/.pm2" "$H/bin" "$H/.indies"
before="$(snapshot)"
run --env staging --dry-run >"$(log links-dry)" 2>&1 && die "a dry run over planted symlinks passed"
run --env staging >"$(log links)" 2>&1 && die "an apply over planted symlinks ran"
for l in "$H/shared/.env" "$H/ecosystem.config.cjs" "$H/.pm2" "$H/bin" "$H/.indies"; do
  grep -q "refused: $l is a symlink" "$(log links)" || die "the symlink $l was not refused"
done
grep -q TOPSECRET /tmp/run-links*.log && die "a root-only file's bytes reached the output"
grep -q 'nothing was changed' "$(log links)" || die "the apply did not stop before its first change"
unchanged "$before" "a refused run changed the host"
rm "$H/shared/.env" "$H/ecosystem.config.cjs" "$H/.pm2" "$H/bin" "$H/.indies"
mv /tmp/keep/env "$H/shared/.env" && mv /tmp/keep/eco "$H/ecosystem.config.cjs" && mv /tmp/keep/pm2 "$H/.pm2"
mv /tmp/keep/bin "$H/bin" && mv /tmp/keep/indies "$H/.indies"
run --env staging >"$(log relink)" 2>&1 || { cat "$(log relink)"; die "the run after the symlinks failed"; }
grep -q "DO     start pm2 process $U" "$(log relink)" || die "pm2 not started again after the symlink test"
run --env staging >"$(log relink2)" 2>&1 && [ "$(changes "$(log relink2)")" = 0 ] || die "not idempotent after the symlink test"
pass "5 planted symlinks each refused; no root-only byte printed; host unchanged; then restored and 0"

# 6. The system pm2 (root:root 775, group root empty) is trusted; a member in group root makes
#    it untrusted, and the run refuses before any change. Then the poller's idle pm2 daemon
#    (its `pm2 describe <user>` starts one) is adopted: the process starts in it, unkilled.
usermod -aG root nobody
before="$(snapshot)"
run --env staging >"$(log member)" 2>&1 && die "a pm2 writable by a member of group root was trusted"
grep -q "ERROR  no trusted system node + pm2 for $U in /usr/bin or /usr/local/bin: /usr/bin/pm2 -> /usr/lib/node_modules/pm2/bin/pm2: /usr/lib/node_modules/pm2/bin/pm2 is writable by group root, whose members are nobody" "$(log member)" ||
  die "the group-root member not named"
unchanged "$before" "the untrusted-pm2 refusal changed the host"
gpasswd -d nobody root >/dev/null
pm2_as "$U" kill >/dev/null
pm2_as "$U" describe "$U" >/dev/null 2>&1 || true
idle="$(cat "$H/.pm2/pm2.pid")"
run --env staging >"$(log adopt)" 2>&1 || { cat "$(log adopt)"; die "the adopting apply failed"; }
grep -q "DO     start pm2 process $U from ~/ecosystem.config.cjs in the pm2 daemon already running for $U (adopted" "$(log adopt)" &&
  [ "$(cat "$H/.pm2/pm2.pid")" = "$idle" ] || die "the poller's daemon was not adopted"
grep -q "ok     node 22.13.0 from /usr/bin, run as $U only" "$(log adopt)" &&
  grep -q 'ok     pm2 7.0.1 at /usr/bin/pm2 (the host' "$(log adopt)" || die "the system node and pm2 not trusted"
run --env staging >"$(log adopt2)" 2>&1 && [ "$(changes "$(log adopt2)")" = 0 ] || die "not idempotent after adopting"
pass "group-0 775 pm2 trusted with no member, refused with one (host unchanged); the poller's idle daemon adopted (pid $idle kept), then 0"
