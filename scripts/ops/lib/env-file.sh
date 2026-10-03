# shellcheck shell=bash
# The site's shared/.env (DEPLOYMENT.md §2, §8). Written once, when it is missing, and never
# rewritten: after that it is the operator's (host-only on staging, D49; Infisical from
# production), and this script only checks it — a wrong value is an error to fix by hand, never
# something the script overwrites.
#
# Every secret is blank. A blank secret refuses the boot check on a deployed host, so a release
# never starts on a guessed or published value; a placeholder string would be a known secret.
#
# The app's one storage key reads and writes both buckets (§6). The engine reads the masters
# bucket's key from its own pair of variables, so MASTERS_ACCESS_KEY_ID names the same key and
# MASTERS_SECRET_ACCESS_KEY holds the same secret; env_preflight fails when the two differ.

# Variables of the two-app shape that no longer mean anything (§8's reshape note): a warning.
ENV_RETIRED_KEYS=(BRAND BRAND_ROOT SITE_URL TEST_STOREFRONT SISTER_BASE_URL SISTER_API_KEY
  SISTER_WEBHOOK_SECRET LINK_TOKEN_KEYS)

env_skeleton() {
  local mail_block midtrans_block
  if [ "$ENVIRONMENT" = production ]; then
    mail_block="# Mail: the production sender is undecided (D13)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM_ADDRESS=
SMTP_FROM_NAME="
    midtrans_block="# Midtrans live keys, only with the owner's go-ahead (COMMERCE.md §6)
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY="
  else
    mail_block="# Mail: staging sends nothing out. Mailpit on this host catches every message (D13);
# read them through an SSH tunnel to 127.0.0.1:$MAILPIT_UI_PORT. SMTP_PASS is Mailpit's own
# credential, generated on this host (root reads it in $MAILPIT_CONF/smtp-password).
SMTP_HOST=127.0.0.1
SMTP_PORT=$MAILPIT_SMTP_PORT
SMTP_USER=$MAILPIT_SMTP_USER
SMTP_PASS=@SMTP_PASS@
SMTP_FROM_ADDRESS=no-reply@$S_DOMAIN
SMTP_FROM_NAME=\"Indies Platform (staging)\""
    midtrans_block="# The payment simulator until the owner's Midtrans sandbox keys arrive; then delete this
# line and set the SB-Mid-… keys (DEPLOYMENT.md §1, §8)
MIDTRANS_MODE=simulate"
  fi
  cat <<EOF
# shared/.env — $S_USER: the Indies Platform, $ENVIRONMENT (shop $SHOP_HOSTS, gallery $GALLERY_HOSTS)
# Written once by scripts/ops/helios-provision.sh ($STAMP); it never rewrites this file.
# Read by the app through node --env-file (~/ecosystem.config.cjs); pm2 also sets HOSTNAME and
# PORT in the process itself (DEPLOYMENT.md §3).
#
# Blank values are secrets. Fill them in on this host, then run the script again: it gives the
# Postgres role and the RustFS key the values written here. A blank secret refuses the boot
# check, so the app never starts on a guess. Never add LOCAL_PRODUCTION_BUILD (§7).

GALLERY_HOSTS=$GALLERY_HOSTS
SHOP_HOSTS=$SHOP_HOSTS
ADMIN_HOST=$S_DOMAIN
RUN_MIGRATIONS=1
HOSTNAME=localhost
PORT=$S_PORT
REVALIDATE_ORIGIN=$S_REVALIDATE_ORIGIN

# Postgres $S_DB as $S_ROLE: the password goes between ':' and '@' (32+ letters and digits)
DATABASE_URL=postgres://$S_ROLE:@127.0.0.1:${PG_PORT:-5432}/$S_DB
PAYLOAD_SECRET=
REVALIDATE_SECRET=
CRON_SECRET=

# Object storage: RustFS on this host, loopback only (D12). The app's one key reads and writes
# both buckets (§6): its secret is 40 letters and digits (openssl rand -hex 20), the SAME in
# S3_SECRET_ACCESS_KEY and MASTERS_SECRET_ACCESS_KEY; the next run creates the key in RustFS.
S3_ENDPOINT=http://127.0.0.1:$RUSTFS_PORT
S3_BUCKET=$S_MEDIA_BUCKET
S3_ACCESS_KEY_ID=$S_KEY
S3_SECRET_ACCESS_KEY=
# Served by the vhost's /_media/ location on the shop's canonical host (the report prints it)
MEDIA_PUBLIC_URL=$S_MEDIA_PUBLIC_URL
MASTERS_BUCKET=$(masters_bucket)
MASTERS_ACCESS_KEY_ID=$S_KEY
MASTERS_SECRET_ACCESS_KEY=

$mail_block

$midtrans_block

# The chat, bot protection and the checkout's map (DEPLOYMENT.md §8): one of each per
# environment, host-only. Blank keeps each feature off or refused, as its own check says.
ANTHROPIC_API_KEY=
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET=
GOOGLE_MAPS_BROWSER_KEY=
GOOGLE_MAPS_SERVER_KEY=
EOF
}

# The values a host's .env must hold as written (an error when they differ), and what it must
# never hold. Read-only: the operator fixes the file.
env_preflight() {
  if ! user_exists_path "$S_ENV"; then
    note "$S_ENV is missing: it will be written from the skeleton"
    return 0
  fi
  local key want have
  for key in GALLERY_HOSTS SHOP_HOSTS ADMIN_HOST RUN_MIGRATIONS HOSTNAME PORT REVALIDATE_ORIGIN; do
    case "$key" in
      GALLERY_HOSTS) want="$GALLERY_HOSTS" ;;
      SHOP_HOSTS) want="$SHOP_HOSTS" ;;
      ADMIN_HOST) want="$S_DOMAIN" ;;
      RUN_MIGRATIONS) want=1 ;;
      HOSTNAME) want=localhost ;;
      PORT) want="$S_PORT" ;;
      REVALIDATE_ORIGIN) want="$S_REVALIDATE_ORIGIN" ;;
    esac
    have="$(env_get "$S_ENV" "$key")"
    [ "$have" = "$want" ] || fail "$S_ENV: $key is '${have}', not '$want'"
  done
  if user_read "$S_ENV" | grep -Eq '^[[:space:]]*(export[[:space:]]+)?LOCAL_PRODUCTION_BUILD[[:space:]]*=[[:space:]]*[^[:space:]]'; then
    fail "$S_ENV sets LOCAL_PRODUCTION_BUILD: never on a host (DEPLOYMENT.md §7) — remove the line"
  elif user_read "$S_ENV" | grep -Eq '^[[:space:]]*(export[[:space:]]+)?LOCAL_PRODUCTION_BUILD'; then
    warn "$S_ENV has an empty LOCAL_PRODUCTION_BUILD line: remove it"
  fi
  if mailpit_wanted && [ -r "$MAILPIT_CONF/smtp-password" ] &&
    [ "$(env_get "$S_ENV" SMTP_PASS)" != "$(cat "$MAILPIT_CONF/smtp-password")" ]; then
    warn "$S_ENV: SMTP_PASS is not Mailpit's ($MAILPIT_CONF/smtp-password): staging mail will be refused"
  fi
  for key in "${ENV_RETIRED_KEYS[@]}"; do
    if env_has "$S_ENV" "$key"; then warn "$S_ENV sets $key, which the one-site app no longer reads (DEPLOYMENT.md §8): remove it"; fi
  done
  for key in S3_ENDPOINT:"http://127.0.0.1:$RUSTFS_PORT" S3_BUCKET:"$S_MEDIA_BUCKET" \
    S3_ACCESS_KEY_ID:"$S_KEY" MASTERS_BUCKET:"$(masters_bucket)" MASTERS_ACCESS_KEY_ID:"$S_KEY" \
    MEDIA_PUBLIC_URL:"$S_MEDIA_PUBLIC_URL"; do
    have="$(env_get "$S_ENV" "${key%%:*}")"
    [ "$have" = "${key#*:}" ] || warn "$S_ENV: ${key%%:*} is '${have}', not '${key#*:}' (the storage this script provisions)"
  done
  if [ "$(env_get "$S_ENV" S3_SECRET_ACCESS_KEY)" != "$(env_get "$S_ENV" MASTERS_SECRET_ACCESS_KEY)" ]; then
    fail "$S_ENV: S3_SECRET_ACCESS_KEY and MASTERS_SECRET_ACCESS_KEY differ: the app has one key, $S_KEY, for both buckets (DEPLOYMENT.md §6) — put the same secret in both"
  fi
  local url
  url="$(env_get "$S_ENV" DATABASE_URL)"
  case "$url" in
    "postgres://$S_ROLE:"*"@127.0.0.1:"*"/$S_DB" | "postgresql://$S_ROLE:"*"@127.0.0.1:"*"/$S_DB") ;;
    *) warn "$S_ENV: DATABASE_URL is not postgres://$S_ROLE:<password>@127.0.0.1:<port>/$S_DB" ;;
  esac
}

ensure_env_file() {
  say "$S_ENV"
  user_dir "$S_HOME/shared" 750
  if user_exists_path "$S_ENV"; then
    ok "$S_ENV exists: never rewritten (checked above)"
    user_mode "$S_ENV" 600
  else
    local content smtp=''
    content="$(env_skeleton)"$'\n'
    if mailpit_wanted; then
      [ -r "$MAILPIT_CONF/smtp-password" ] && smtp="$(cat "$MAILPIT_CONF/smtp-password")"
      if dry; then preview "${content//@SMTP_PASS@/<Mailpit SMTP password, generated on this host>}"; fi
    elif dry; then
      preview "${content//@SMTP_PASS@/}"
    fi
    act "write $S_ENV from the skeleton (600, as $S_USER; every app secret blank)" \
      user_write "$S_ENV" 600 "${content//@SMTP_PASS@/$smtp}"
  fi
  report_blank_secrets
}

report_blank_secrets() {
  user_exists_path "$S_ENV" || return 0
  local blank
  blank="$(user_read "$S_ENV" | awk -F= '/^[A-Z][A-Z0-9_]*=/ { v = substr($0, index($0, "=") + 1); if (v == "" || v == "\"\"") printf "%s ", $1 }')"
  if [ -z "$(env_db_password)" ]; then blank="${blank}DATABASE_URL(password) "; fi
  [ -z "$blank" ] || note "blank in $S_ENV (fill in on this host): $blank"
}
