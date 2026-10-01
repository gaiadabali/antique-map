# shellcheck shell=bash
# --replace-site OLD_DOMAIN (repeatable, opt-in): removes a CloudPanel site an earlier run made
# under a host name the owner has since changed (2026-10-01: ig.gaiada.com became
# indies-gallery.gaiada.com, oei.gaiada.com old-east-indies.gaiada.com), so that --create-sites
# makes the new site under the SAME site user. Refused, with the reason, unless all of these hold:
#   - OLD's vhost names (in its `root /home/<user>/htdocs/…`) a site user this run provisions,
#     and the new domain has no vhost yet
#   - the home holds what this script made and nothing else: shared/.env (ours, every app secret
#     blank, no key the skeleton lacks), releases/bootstrap-holding, the ecosystem file, ~/bin's
#     two helpers, ~/.indies — besides CloudPanel's skeleton (its dotfiles, an htdocs tree
#     without a file, logs, tmp, .ssh, .nvm, .npm, .cache), pm2's own ~/.pm2, and the GDA deploy
#     poller's output: releases/deploy_* and `current` pointing into one of them or the holding
#     release (the poller deploys into every new CloudPanel site user within a minute)
#   - no process runs as the user but an idle pm2 daemon — the one the poller's `pm2 describe`
#     starts — whose `pm2 jlist` is [] (asked only while it runs); pm2-<user>.service is not
#     active; and its crontab has no line outside this script's block
# Then the crontab, shared/.env and the vhost are copied to /var/backups/indies/config/
# replace-site/OLD.<stamp>/ (700 root), the idle daemon is stopped (`pm2 kill`, as the user),
# and the checks run again with no process allowed at all: the poller may have started a daemon
# or deployed in between, and then nothing is deleted. Last, the crontab is removed (one left
# under the name would belong to the old uid) and `clpctl site:delete --domainName=OLD --force`.
#
# What clpctl site:delete removes is CloudPanel's site delete (the panel's Delete button; --force
# skips its question): the site's record, nginx vhost and certificate, its site user and that
# user's home with everything in it, and any MySQL database or user CloudPanel made for it.
# CloudPanel manages MySQL/MariaDB only, so the Postgres database and role are not its to delete.
# That is CloudPanel's documented behaviour, not measured here: so every run prints the home's
# full listing first, and after the delete the run checks the vhost, user and home are gone and
# the Postgres database is still there, and stops that site if any of it is not so.

REPLACE_SITES=()
declare -A REPLACE_OK=()
REPLACE_PLANNED=0
APP_SECRET_KEYS=(PAYLOAD_SECRET REVALIDATE_SECRET CRON_SECRET LINK_TOKEN_KEYS S3_SECRET_ACCESS_KEY
  MASTERS_SECRET_ACCESS_KEY SISTER_API_KEY SISTER_WEBHOOK_SECRET)

# vhost_users CONF — the distinct site users a CloudPanel vhost's root lines name.
vhost_users() {
  sed -nE 's|^[[:space:]]*root[[:space:]]+/home/([a-z][a-z0-9-]*)/htdocs/[^;]*;.*$|\1|p' "$1" | sort -u
}

# replace_map — each OLD_DOMAIN to the app whose site user owns it (read-only).
replace_map() {
  [ "${#REPLACE_SITES[@]}" -gt 0 ] || return 0
  say "--replace-site ${REPLACE_SITES[*]}"
  local old conf users app hit
  for old in "${REPLACE_SITES[@]}"; do
    conf="$VHOST_DIR/$old.conf"
    if [ ! -f "$conf" ]; then
      ok "$old: no vhost at $conf — already gone, nothing to replace"
      continue
    fi
    users="$(vhost_users "$conf" | paste -sd, -)"
    hit=''
    for app in $(selected_apps); do
      load_site "$app"
      if [ "$S_USER" = "$users" ]; then hit="$app"; fi
    done
    if [ -z "$hit" ]; then
      fail "--replace-site $old refused: its vhost's site user is '${users:-none found}', not one this run provisions ($(for app in $(selected_apps); do load_site "$app" && printf '%s ' "$S_USER"; done))"
    elif [ -n "${REPLACE_OF[$hit]:-}" ]; then
      fail "--replace-site $old refused: ${REPLACE_OF[$hit]} is $users's site too; one at a time"
    else
      REPLACE_OF[$hit]="$old"
      load_site "$hit"
      ok "$old is $S_USER's site: it is replaced by $S_DOMAIN if the home passes the checks ($hit)"
    fi
  done
}

# home_unexpected — every path in the home that is neither this script's nor CloudPanel's or
# pm2's own, as "type path" (find's %y). Listed as the user; find follows no link.
home_unexpected() {
  local type rel holding="releases/bootstrap-holding"
  site_run find "$S_HOME" -mindepth 1 \( -path "$S_HOME/releases/deploy_*/*" -o -path "$S_HOME/.nvm/*" \) \
    -prune -o -printf '%y\t%P\n' 2>/dev/null | while IFS=$'\t' read -r type rel; do
    case "$rel" in
      releases/deploy_*) [ "$type" = d ] && continue ;;
      .nvm | .nvm/* | .npm | .npm/* | .cache | .cache/* | .pm2 | .pm2/* | logs | logs/* | tmp | tmp/* | \
        .ssh | .ssh/* | .indies | .indies/*) continue ;;
      .bashrc | .profile | .bash_logout | .bash_history | .viminfo | .lesshst | .selected_editor | \
        .wget-hsts | .sudo_as_admin_successful | .node_repl_history | .npmrc | ecosystem.config.cjs | \
        shared/.env | bin/indies-cron | bin/indies-health | "$holding/engine/apps/$S_APP/server.js")
        [ "$type" = f ] && continue ;;
      htdocs | htdocs/* | shared | bin | releases | "$holding" | "$holding/brand" | "$holding/engine" | \
        "$holding/engine/apps" | "$holding/engine/apps/$S_APP")
        [ "$type" = d ] && continue ;;
      current) [ "$type" = l ] && continue ;;
    esac
    printf '%s %s\n' "$type" "$rel"
  done
}

# replace_reasons [strict] — why this site may not be replaced, one reason per line; nothing
# when it may. strict (right before the delete) allows no process at all, not even pm2's.
replace_reasons() {
  local p key have skeleton daemon=''
  [ ! -e "$VHOST_DIR/$S_DOMAIN.conf" ] || echo "the new site's vhost $VHOST_DIR/$S_DOMAIN.conf exists already"
  home_unexpected | head -n 20 | sed 's/^\(.\) \(.*\)$/the home holds \2 (find type \1), which this script did not make/'
  for p in ecosystem.config.cjs:'Written by scripts/ops/helios-provision.sh' \
    bin/indies-cron:'written by scripts/ops/helios-provision.sh' \
    bin/indies-health:'written by scripts/ops/helios-provision.sh' \
    "releases/bootstrap-holding/engine/apps/$S_APP/server.js":'Holding server until the first release lands'; do
    if user_exists_path "$S_HOME/${p%%:*}" && ! user_read "$S_HOME/${p%%:*}" | grep -qF "${p#*:}"; then
      echo "$S_HOME/${p%%:*} is not the file this script writes"
    fi
  done
  have="$(readlink "$S_CURRENT" 2>/dev/null || true)"
  case "$have" in /*) ;; ?*) have="$S_HOME/$have" ;; esac
  case "$have" in
    '' | "$S_HOME/releases/bootstrap-holding" | "$S_HOME"/releases/deploy_*) ;;
    *) echo "current -> $have: neither the holding release nor a deploy agent's release" ;;
  esac
  if user_exists_path "$S_ENV"; then
    user_read "$S_ENV" | grep -qF 'Written once by scripts/ops/helios-provision.sh' ||
      echo "$S_ENV was not written by this script"
    skeleton="$(env_skeleton | sed -nE 's/^([A-Z][A-Z0-9_]*)=.*/\1/p')"
    user_read "$S_ENV" | sed -nE 's/^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=.*/\2/p' |
      sort -u | while read -r key; do
      grep -qxF "$key" <<<"$skeleton" || echo "$S_ENV sets $key, which the skeleton does not: the operator's"
    done
    for key in "${APP_SECRET_KEYS[@]}"; do
      [ -z "$(env_get "$S_ENV" "$key")" ] || echo "$S_ENV has $key filled in"
    done
    if [ "$ENVIRONMENT" = production ] && [ -n "$(env_get "$S_ENV" SMTP_PASS)" ]; then echo "$S_ENV has SMTP_PASS filled in"; fi
    [ -z "$(env_db_password)" ] || echo "$S_ENV's DATABASE_URL has a password"
  fi
  if [ "${1:-}" != strict ] && pm2_daemon_live; then
    daemon="$(pm2_pid)"
    resolve_site_path
    have="$( (site_run pm2 jlist 2>/dev/null || true) | tail -n 1 | python3 -c '
import json, sys
try: print(" ".join(p.get("name", "?") + ":" + p.get("pm2_env", {}).get("status", "?") for p in json.load(sys.stdin)) or "none")
except Exception: print("unreadable")' 2>/dev/null)"
    [ "$have" = none ] || echo "the pm2 daemon for $S_USER has apps defined: ${have:-unreadable} (pm2 jlist is not [])"
  fi
  have="$(pgrep -a -u "$S_USER" 2>/dev/null | awk -v d="$daemon" '$1 != d' | head -n 5 | paste -sd';' -)"
  [ -z "$have" ] || echo "processes run as $S_USER: $have"
  if systemctl is-active --quiet "pm2-$S_USER.service" 2>/dev/null; then echo "pm2-$S_USER.service is active"; fi
  if ! have="$(cron_unmanaged "$(crontab -u "$S_USER" -l 2>/dev/null || true)")"; then
    echo "$S_USER's crontab has broken indies-provision markers"
  elif grep -Evq '^[[:space:]]*(#|$)' <<<"$have"; then
    echo "$S_USER's crontab has lines outside this script's block: $(grep -Ev '^[[:space:]]*(#|$)' <<<"$have" | head -n 3 | paste -sd';' -)"
  fi
}

# replace_preflight — from site_preflight, for a site with --replace-site.
replace_preflight() {
  REPLACE_OK[$S_APP]=0
  command -v clpctl >/dev/null 2>&1 || fail "--replace-site needs CloudPanel's clpctl on PATH"
  command -v pgrep >/dev/null 2>&1 || fail "--replace-site needs pgrep (procps)"
  local reasons r
  reasons="$(replace_reasons)"
  if [ -z "$reasons" ]; then
    REPLACE_OK[$S_APP]=1
    ok "--replace-site $S_REPLACE: $S_HOME holds only this script's and CloudPanel's files, every app secret blank, nothing runs as $S_USER"
    return 0
  fi
  while IFS= read -r r; do fail "--replace-site $S_REPLACE refused: $r"; done <<<"$reasons"
}

replace_plan() {
  note "clpctl site:delete --domainName=$S_REPLACE --force — CloudPanel deletes the site $S_REPLACE: its record, the vhost $VHOST_DIR/$S_REPLACE.conf (and reloads nginx), its certificate, any MySQL database or user it made for it, the site user $S_USER (uid $(id -u "$S_USER")) and its home $S_HOME, that is:"
  site_run find "$S_HOME" -mindepth 1 -printf '%y\t%P\n' 2>/dev/null | sort -t$'\t' -k2 | awk -F'\t' '
    { split($2, p, "/") }
    p[1] ~ /^\.(nvm|npm|cache)$/ && $2 != p[1] { n[p[1]]++; next }
    p[1] == "releases" && p[2] ~ /^deploy_/ && p[3] != "" {
      k = p[1] "/" p[2]; n[k]++; t = k "/" p[3]
      if (!(t in seen)) { seen[t]; printf "          | %s (in the deploy agent release)\n", t }
      next }
    { printf "          | %s %s\n", $1, $2 }
    END { for (k in n) printf "          | (%d entries under %s/)\n", n[k], k }'
  note "it does not touch Postgres: $S_DB and role $S_ROLE stay (checked after the delete), nor RustFS"
}

backup_replaced() {
  local dir="$BACKUP_ROOT/config/replace-site/$S_REPLACE.$STAMP"
  install -d -m 700 -o root -g root "$BACKUP_ROOT" "$BACKUP_ROOT/config" "$BACKUP_ROOT/config/replace-site" "$dir"
  (
    umask 077
    crontab -u "$S_USER" -l >"$dir/crontab" 2>/dev/null || : >"$dir/crontab"
    if user_exists_path "$S_ENV"; then user_read "$S_ENV" >"$dir/shared.env"; fi
    cat -- "$VHOST_DIR/$S_REPLACE.conf" >"$dir/vhost.conf"
  )
}

# stop_idle_pm2 — the poller's idle pm2 daemon, killed as the user (it runs no app: checked).
stop_idle_pm2() {
  resolve_site_path
  site_run pm2 kill >/dev/null 2>&1 || true
  wait_for 10 pm2_daemon_gone
}

delete_old_site() {
  if crontab -u "$S_USER" -l >/dev/null 2>&1; then crontab -u "$S_USER" -r; fi
  clpctl site:delete --domainName="$S_REPLACE" --force
}

# replace_site — in the apply loop, before ensure_cloudpanel_site. Returns 1 when the site's
# remaining steps must not run (refused, or the delete left something behind).
replace_site() {
  REPLACE_PLANNED=0
  [ -n "$S_REPLACE" ] && [ -f "$VHOST_DIR/$S_REPLACE.conf" ] || return 0
  say "$S_APP: replace $S_REPLACE with $S_DOMAIN (site user $S_USER)"
  if [ "${REPLACE_OK[$S_APP]:-0}" != 1 ]; then
    note "refused above: $S_REPLACE is not deleted, and $S_APP's steps are skipped"
    return 1
  fi
  replace_plan
  act "copy $S_USER's crontab, $S_ENV and the vhost to $BACKUP_ROOT/config/replace-site/$S_REPLACE.$STAMP/ (700 root)" \
    backup_replaced
  if pm2_daemon_live && ! act "stop $S_USER's idle pm2 daemon (pid $(pm2_pid); pm2 kill, as $S_USER)" stop_idle_pm2; then
    fail "$S_USER's pm2 daemon did not stop: $S_REPLACE is not deleted"
    return 1
  fi
  if ! dry; then
    local again
    again="$(replace_reasons strict)"
    if [ -n "$again" ]; then
      while IFS= read -r r; do fail "--replace-site $S_REPLACE: changed since the check, so nothing is deleted: $r"; done <<<"$again"
      return 1
    fi
    ok "checked again right before the delete: still only this script's, CloudPanel's and the poller's files; nothing runs as $S_USER"
  fi
  if ! act "remove $S_USER's crontab and run clpctl site:delete --domainName=$S_REPLACE --force" delete_old_site; then
    fail "clpctl site:delete --domainName=$S_REPLACE failed (its output above): $S_APP's steps are skipped"
    return 1
  fi
  if dry; then
    REPLACE_PLANNED=1
    return 0
  fi
  if [ -e "$VHOST_DIR/$S_REPLACE.conf" ] || id -u "$S_USER" >/dev/null 2>&1 || [ -e "$S_HOME" ]; then
    fail "clpctl site:delete $S_REPLACE left$([ -e "$VHOST_DIR/$S_REPLACE.conf" ] && printf ' its vhost')$(id -u "$S_USER" >/dev/null 2>&1 && printf ' the user %s' "$S_USER")$([ -e "$S_HOME" ] && printf ' %s' "$S_HOME"): no new site is made over them — look, remove by hand, re-run"
    return 1
  fi
  ok "$S_REPLACE is gone: its vhost, the user $S_USER and $S_HOME"
  if [ -n "$(db_owner "$S_DB")" ]; then
    ok "Postgres $S_DB (owner $(db_owner "$S_DB")) survived"
  else
    fail "Postgres $S_DB is gone after clpctl site:delete"
  fi
}
