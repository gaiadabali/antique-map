# shellcheck shell=bash
# Who serves which brand, and where (DEPLOYMENT.md §2). A site is one storefront app, `gallery`
# or `emporium`, and its spec is USER:PORT:DATABASE:ROLE:DOMAIN.
#
# Staging is DEPLOYMENT.md §2's table as written. Production is new site users, databases and
# ports at cutover (§1), which no doc names yet, so a production run is refused until both specs
# are passed explicitly (--gallery, --emporium) together with a bucket suffix, so production's
# buckets can never be staging's.

declare -A SPEC=()
declare -A OVERRIDE=()
ENVIRONMENT=''
BUCKET_SUFFIX=''
ONLY=''
APPS=(gallery emporium)

# Shared services on this host (all loopback; every port verified free at run time).
RUSTFS_PORT=4032
RUSTFS_CONSOLE_PORT=4033
MAILPIT_SMTP_PORT=4034
MAILPIT_UI_PORT=4035

brand_of() {
  case "$1" in
    gallery) printf 'indies-gallery' ;;
    emporium) printf 'old-east-indies' ;;
  esac
}
label_of() {
  case "$1" in
    gallery) printf 'Indies Gallery' ;;
    emporium) printf 'Old East Indies' ;;
  esac
}
sister_of() {
  case "$1" in
    gallery) printf 'emporium' ;;
    emporium) printf 'gallery' ;;
  esac
}
media_bucket_of() {
  case "$1" in
    gallery) printf 'ig-media%s' "$BUCKET_SUFFIX" ;;
    emporium) printf 'oei-media%s' "$BUCKET_SUFFIX" ;;
  esac
}
masters_bucket() { printf 'archive-masters%s' "$BUCKET_SUFFIX"; }

set_profile() {
  case "$ENVIRONMENT" in
    staging)
      SPEC[gallery]='uig:4030:ig_db:ig:ig.gaiada.com'
      SPEC[emporium]='uoei:4031:oei_db:oei:oei.gaiada.com'
      ;;
    production)
      if [ -z "${OVERRIDE[gallery]:-}" ] || [ -z "${OVERRIDE[emporium]:-}" ]; then
        die "production needs --gallery and --emporium USER:PORT:DATABASE:ROLE:DOMAIN: its site users, databases and ports are new at cutover (DEPLOYMENT.md §1) and no doc names them yet"
      fi
      [ -n "$BUCKET_SUFFIX" ] ||
        die "production needs --bucket-suffix (e.g. -live), so its buckets are never staging's"
      ;;
    *) die "--env staging|production is required" ;;
  esac
  local app
  for app in "${APPS[@]}"; do
    if [ -n "${OVERRIDE[$app]:-}" ]; then SPEC[$app]="${OVERRIDE[$app]}"; fi
    validate_spec "$app"
  done
  distinct_specs
  [[ "$BUCKET_SUFFIX" =~ ^(-[a-z0-9]{1,16})?$ ]] || die "--bucket-suffix is '-' then 1-16 of a-z0-9"
  case "$ONLY" in '' | gallery | emporium) ;; *) die "--only gallery|emporium" ;; esac
}

validate_spec() {
  local app="$1" user port db role domain rest
  IFS=: read -r user port db role domain rest <<<"${SPEC[$app]}"
  [ -z "$rest" ] || die "$app: the spec has more than five fields"
  [[ "$user" =~ ^[a-z][a-z0-9-]{1,30}$ ]] || die "$app: site user '$user' is not a Linux user name"
  if ! [[ "$port" =~ ^[0-9]{4,5}$ ]] || [ "$port" -lt 1024 ] || [ "$port" -gt 65535 ]; then
    die "$app: port '$port' is not 1024-65535"
  fi
  [[ "$db" =~ ^[a-z_][a-z0-9_]{1,62}$ ]] || die "$app: database '$db' is not a plain identifier"
  [[ "$role" =~ ^[a-z_][a-z0-9_]{1,62}$ ]] || die "$app: role '$role' is not a plain identifier"
  [[ "$domain" =~ ^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$ ]] || die "$app: '$domain' is not a domain"
  if [ "$ENVIRONMENT" = production ] && [[ "$domain" == *.gaiada.com ]]; then
    die "$app: $domain is a staging host name; production serves the brand's own domain"
  fi
}

distinct_specs() {
  local a b i
  IFS=: read -r -a a <<<"${SPEC[gallery]}"
  IFS=: read -r -a b <<<"${SPEC[emporium]}"
  for i in 0 1 2 3 4; do
    [ "${a[$i]}" != "${b[$i]}" ] || die "gallery and emporium share '${a[$i]}': one of each per brand"
  done
  for i in "${a[1]}" "${b[1]}"; do
    case "$i" in "$RUSTFS_PORT" | "$RUSTFS_CONSOLE_PORT" | "$MAILPIT_SMTP_PORT" | "$MAILPIT_UI_PORT")
      die "app port $i is also a service port (RustFS $RUSTFS_PORT/$RUSTFS_CONSOLE_PORT, Mailpit $MAILPIT_SMTP_PORT/$MAILPIT_UI_PORT)" ;;

    esac
  done
}

# selected_apps — the apps this run provisions (--only narrows it).
selected_apps() {
  if [ -n "$ONLY" ]; then printf '%s\n' "$ONLY"; else printf '%s\n' "${APPS[@]}"; fi
}

# load_site APP — sets the S_* globals every per-site step reads.
load_site() {
  S_APP="$1"
  IFS=: read -r S_USER S_PORT S_DB S_ROLE S_DOMAIN <<<"${SPEC[$1]}"
  S_BRAND="$(brand_of "$1")"
  S_LABEL="$(label_of "$1")"
  S_HOME="/home/$S_USER"
  S_ENV="$S_HOME/shared/.env"
  S_CURRENT="$S_HOME/current"
  S_SITE_URL="https://$S_DOMAIN"
  S_REVALIDATE_ORIGIN="http://127.0.0.1:$S_PORT"
  S_BRAND_ROOT="$S_CURRENT/brand"
  S_SERVER_JS="$S_CURRENT/engine/apps/$1/server.js"
  S_MEDIA_BUCKET="$(media_bucket_of "$1")"
  S_MEDIA_KEY="$S_USER-media"
  S_MASTERS_KEY="$S_USER-masters"
  local sister
  sister="$(sister_of "$1")"
  IFS=: read -r _ _ _ _ S_SISTER_DOMAIN <<<"${SPEC[$sister]}"
}
