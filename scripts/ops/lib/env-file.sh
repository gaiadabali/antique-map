# shellcheck shell=bash
# Each site's shared/.env (DEPLOYMENT.md §2, §8). Written once, when it is missing, and never
# rewritten: after that it is the operator's (Infisical is its source, §6), and this script only
# checks it — a wrong value is an error to fix by hand, never something the script overwrites.
#
# Every secret is blank. A blank secret refuses the boot check on a deployed host, so a release
# never starts on a guessed or published value; a placeholder string would be a known secret.

env_skeleton() {
  local sister_line mail_block
  if [ "$ENVIRONMENT" = production ]; then
    sister_line="SISTER_BASE_URL=https://$S_SISTER_DOMAIN"
    mail_block="# Mail: the production sender is undecided (D13) — fill from Infisical
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM_ADDRESS=
SMTP_FROM_NAME=\"$S_LABEL\""
  else
    sister_line="# SISTER_BASE_URL stays unset on staging: sisters[0].baseUrl, the committed origin, is the
# sister's staging site (DEPLOYMENT.md §8). Production sets it to the sister's production site."
    mail_block="# Mail: staging sends nothing out. Mailpit on this host catches every message (D13);
# read them through an SSH tunnel to 127.0.0.1:$MAILPIT_UI_PORT.
SMTP_HOST=127.0.0.1
SMTP_PORT=$MAILPIT_SMTP_PORT
SMTP_USER=
SMTP_PASS=
SMTP_FROM_ADDRESS=no-reply@$S_DOMAIN
SMTP_FROM_NAME=\"$S_LABEL (staging)\""
  fi
  cat <<EOF
# shared/.env — $S_USER: $S_LABEL ($S_BRAND), $ENVIRONMENT, $S_SITE_URL
# Written once by scripts/ops/helios-provision.sh ($STAMP); it never rewrites this file.
# Read by the app through node --env-file (~/ecosystem.config.cjs); pm2 sets HOSTNAME, PORT
# and BRAND_ROOT in the process itself (DEPLOYMENT.md §3).
#
# Blank values are secrets. Fill them from Infisical, then run the script again: it gives the
# Postgres role and the RustFS keys the values written here. A blank secret refuses the boot
# check, so the app never starts on a guess. Never add LOCAL_PRODUCTION_BUILD (§8).

BRAND=$S_BRAND
BRAND_ROOT=$S_BRAND_ROOT
SITE_URL=$S_SITE_URL
RUN_MIGRATIONS=1
REVALIDATE_ORIGIN=$S_REVALIDATE_ORIGIN

# Postgres $S_DB as $S_ROLE: the password goes between ':' and '@' (32+ letters and digits)
DATABASE_URL=postgres://$S_ROLE:@127.0.0.1:${PG_PORT:-5432}/$S_DB
PAYLOAD_SECRET=
REVALIDATE_SECRET=
CRON_SECRET=
# The capability links' key ring: kid:secret, the secret base64url of 32 random bytes (§8)
LINK_TOKEN_KEYS=

# Object storage: RustFS on this host, loopback only (D12). A secret is 40 letters and digits
# (openssl rand -hex 20); the next run creates the key in RustFS with it.
S3_ENDPOINT=http://127.0.0.1:$RUSTFS_PORT
S3_BUCKET=$S_MEDIA_BUCKET
S3_ACCESS_KEY_ID=$S_MEDIA_KEY
S3_SECRET_ACCESS_KEY=
# Set to $S_SITE_URL/_media once the site's vhost serves /_media/ from RustFS — the script's
# report prints the location block to paste in CloudPanel. Blank refuses the boot check.
MEDIA_PUBLIC_URL=
MASTERS_BUCKET=$(masters_bucket)
MASTERS_ACCESS_KEY_ID=$S_MASTERS_KEY
MASTERS_SECRET_ACCESS_KEY=

$mail_block

# Sister sync (C12)
SISTER_API_KEY=
SISTER_WEBHOOK_SECRET=
$sister_line

# Payment and shipping keys per seller go below, by the names in PAYMENTS.md §8 and
# DEPLOYMENT.md §8 — sandbox keys on staging, live keys in production.
EOF
}

# The values a host's .env must hold as written (an error when they differ), and what it must
# never hold. Read-only: the operator fixes the file.
env_preflight() {
  if [ ! -f "$S_ENV" ]; then
    note "$S_ENV is missing: it will be written from the skeleton"
    return 0
  fi
  local key want have
  for key in BRAND BRAND_ROOT SITE_URL RUN_MIGRATIONS REVALIDATE_ORIGIN; do
    case "$key" in
      BRAND) want="$S_BRAND" ;;
      BRAND_ROOT) want="$S_BRAND_ROOT" ;;
      SITE_URL) want="$S_SITE_URL" ;;
      RUN_MIGRATIONS) want=1 ;;
      REVALIDATE_ORIGIN) want="$S_REVALIDATE_ORIGIN" ;;
    esac
    have="$(env_get "$S_ENV" "$key")"
    [ "$have" = "$want" ] || fail "$S_ENV: $key is '${have}', not '$want'"
  done
  if [ -n "$(env_get "$S_ENV" LOCAL_PRODUCTION_BUILD)" ]; then
    fail "$S_ENV sets LOCAL_PRODUCTION_BUILD: never on a host (DEPLOYMENT.md §8) — remove the line"
  elif env_has "$S_ENV" LOCAL_PRODUCTION_BUILD; then
    warn "$S_ENV has an empty LOCAL_PRODUCTION_BUILD line: remove it"
  fi
  have="$(env_get "$S_ENV" HOSTNAME)"
  case "$have" in
    127.* | ::1 | '[::1]' | 2130706433 | 0x7f*)
      fail "$S_ENV: HOSTNAME=$have is a loopback IP, at which every page hangs (DEPLOYMENT.md §3)"
      ;;
  esac
  have="$(env_get "$S_ENV" SISTER_BASE_URL)"
  if [ "$ENVIRONMENT" = production ] && [ "$have" != "https://$S_SISTER_DOMAIN" ]; then
    fail "$S_ENV: production's SISTER_BASE_URL is '${have}', not https://$S_SISTER_DOMAIN"
  fi
  for key in S3_ENDPOINT:"http://127.0.0.1:$RUSTFS_PORT" S3_BUCKET:"$S_MEDIA_BUCKET" \
    S3_ACCESS_KEY_ID:"$S_MEDIA_KEY" MASTERS_BUCKET:"$(masters_bucket)" \
    MASTERS_ACCESS_KEY_ID:"$S_MASTERS_KEY"; do
    have="$(env_get "$S_ENV" "${key%%:*}")"
    [ "$have" = "${key#*:}" ] || warn "$S_ENV: ${key%%:*} is '${have}', not '${key#*:}' (the RustFS this script provisions)"
  done
  local url
  url="$(env_get "$S_ENV" DATABASE_URL)"
  case "$url" in
    "postgres://$S_ROLE:"*"@127.0.0.1:"*"/$S_DB" | "postgresql://$S_ROLE:"*"@127.0.0.1:"*"/$S_DB") ;;
    *) warn "$S_ENV: DATABASE_URL is not postgres://$S_ROLE:<password>@127.0.0.1:<port>/$S_DB" ;;
  esac
}

ensure_env_file() {
  say "$S_APP: $S_ENV"
  ensure_dir "$S_HOME/shared" 750 "$S_USER:$S_USER"
  if [ -f "$S_ENV" ]; then
    ok "$S_ENV exists: never rewritten (checked above)"
    ensure_mode "$S_ENV" 600 "$S_USER:$S_USER"
  else
    local content
    content="$(env_skeleton)"$'\n'
    act "write $S_ENV from the skeleton (600 $S_USER; every secret blank)" \
      write_file "$S_ENV" 600 "$S_USER:$S_USER" "$content"
    if dry; then preview "$content"; fi
  fi
  report_blank_secrets
}

report_blank_secrets() {
  [ -f "$S_ENV" ] || return 0
  local blank
  blank="$(awk -F= '/^[A-Z][A-Z0-9_]*=/ { v = substr($0, index($0, "=") + 1); if (v == "" || v == "\"\"") printf "%s ", $1 }' "$S_ENV")"
  # Mailpit takes no credentials, so staging's blank SMTP_USER and SMTP_PASS are not secrets owed.
  if [ "$ENVIRONMENT" = staging ]; then
    blank="${blank//SMTP_USER /}"
    blank="${blank//SMTP_PASS /}"
  fi
  if [ -z "$(env_db_password)" ]; then blank="${blank}DATABASE_URL(password) "; fi
  [ -z "$blank" ] || note "blank in $S_ENV (fill from Infisical): $blank"
}
