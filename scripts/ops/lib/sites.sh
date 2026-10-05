# shellcheck shell=bash
# Who serves the platform, and where (DEPLOYMENT.md §2). One app serves both sites, chosen by
# the request's Host: one CloudPanel site, one site user and pm2 process, one port, one database
# and role. The site's spec is USER:PORT:DATABASE:ROLE; its hostnames are two comma-separated
# lists, the first of each canonical, exactly as the app reads GALLERY_HOSTS and SHOP_HOSTS (§8).
# The CloudPanel site is the shop's canonical host, which is also ADMIN_HOST and the host of
# MEDIA_PUBLIC_URL (/_media/); its nginx vhost names every host in server_name and passes Host.
#
# Staging is §2's site on the host names the owner chose on 2026-10-01. Production is a new site
# user, database, port and hostnames at cutover (§1), which no doc names yet, so a production run
# is refused until the spec and both host lists are passed explicitly (--site, --shop-hosts,
# --gallery-hosts) together with a bucket suffix, so production's buckets can never be staging's.

ENVIRONMENT=''
BUCKET_SUFFIX=''
SITE_SPEC=''
SHOP_HOSTS=''
GALLERY_HOSTS=''

# Shared services on this host (all loopback; every port verified free at run time).
RUSTFS_PORT=4032
RUSTFS_CONSOLE_PORT=4033
MAILPIT_SMTP_PORT=4034
MAILPIT_UI_PORT=4035

media_bucket() { printf 'indies-media%s' "$BUCKET_SUFFIX"; }
masters_bucket() { printf 'archive-masters%s' "$BUCKET_SUFFIX"; }

DOMAIN_RE='^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$'

set_profile() {
  case "$ENVIRONMENT" in
    staging)
      [ -n "$SITE_SPEC" ] || SITE_SPEC='uindies:4030:indies_db:indies'
      [ -n "$SHOP_HOSTS" ] || SHOP_HOSTS='old-east-indies.gaiada.com'
      [ -n "$GALLERY_HOSTS" ] || GALLERY_HOSTS='indies-gallery.gaiada.com'
      ;;
    production)
      if [ -z "$SITE_SPEC" ] || [ -z "$SHOP_HOSTS" ] || [ -z "$GALLERY_HOSTS" ]; then
        die "production needs --site USER:PORT:DATABASE:ROLE, --shop-hosts and --gallery-hosts: its site user, database, port and hostnames are new at cutover (DEPLOYMENT.md §1) and no doc names them yet"
      fi
      [ -n "$BUCKET_SUFFIX" ] ||
        die "production needs --bucket-suffix (e.g. -live), so its buckets are never staging's"
      ;;
    *) die "--env staging|production is required" ;;
  esac
  validate_spec
  validate_hosts
  [[ "$BUCKET_SUFFIX" =~ ^(-[a-z0-9]{1,16})?$ ]] || die "--bucket-suffix is '-' then 1-16 of a-z0-9"
}

validate_spec() {
  local user port db role
  [[ "$SITE_SPEC" =~ ^[^:]+:[^:]+:[^:]+:[^:]+$ ]] ||
    die "--site: USER:PORT:DATABASE:ROLE, four fields (the hostnames are --shop-hosts and --gallery-hosts)"
  IFS=: read -r user port db role <<<"$SITE_SPEC"
  [[ "$user" =~ ^[a-z][a-z0-9-]{1,30}$ ]] || die "site user '$user' is not a Linux user name"
  if ! [[ "$port" =~ ^[0-9]{4,5}$ ]] || [ "$port" -lt 1024 ] || [ "$port" -gt 65535 ]; then
    die "port '$port' is not 1024-65535"
  fi
  [[ "$db" =~ ^[a-z_][a-z0-9_]{1,62}$ ]] || die "database '$db' is not a plain identifier"
  [[ "$role" =~ ^[a-z_][a-z0-9_]{1,62}$ ]] || die "role '$role' is not a plain identifier"
  case "$port" in "$RUSTFS_PORT" | "$RUSTFS_CONSOLE_PORT" | "$MAILPIT_SMTP_PORT" | "$MAILPIT_UI_PORT")
    die "app port $port is also a service port (RustFS $RUSTFS_PORT/$RUSTFS_CONSOLE_PORT, Mailpit $MAILPIT_SMTP_PORT/$MAILPIT_UI_PORT)" ;;
  esac
}

# validate_hosts — each list holds plain domains, none twice, and no host is on both lists.
validate_hosts() {
  local h seen=' ' list
  [[ "$SHOP_HOSTS" =~ ^[a-z0-9.-]+(,[a-z0-9.-]+)*$ ]] && [[ "$GALLERY_HOSTS" =~ ^[a-z0-9.-]+(,[a-z0-9.-]+)*$ ]] ||
    die "--shop-hosts and --gallery-hosts are each one or more hosts, comma-separated, nothing else"
  IFS=, read -r -a list <<<"$SHOP_HOSTS,$GALLERY_HOSTS"
  for h in "${list[@]}"; do
    [[ "$h" =~ $DOMAIN_RE ]] || die "'$h' is not a domain (--shop-hosts, --gallery-hosts: no scheme or port)"
    case "$seen" in *" $h "*) die "$h is named twice: a host serves one site" ;; esac
    seen="$seen$h "
    if [ "$ENVIRONMENT" = production ] && [[ "$h" == *.gaiada.com ]]; then
      die "$h is a staging host name; production serves the sites' own domains"
    fi
  done
}

# all_hosts — every hostname the vhost serves, one per line: the shop's, then the gallery's.
all_hosts() { tr ',' '\n' <<<"$SHOP_HOSTS,$GALLERY_HOSTS"; }

# load_site — sets the S_* globals every per-site step reads (there is one site).
load_site() {
  S_APP=web
  IFS=: read -r S_USER S_PORT S_DB S_ROLE <<<"$SITE_SPEC"
  S_DOMAIN="${SHOP_HOSTS%%,*}"
  S_HOME="/home/$S_USER"
  S_ENV="$S_HOME/shared/.env"
  S_CURRENT="$S_HOME/current"
  S_SITE_URL="https://$S_DOMAIN"
  S_MEDIA_PUBLIC_URL="$S_SITE_URL/_media"
  S_REVALIDATE_ORIGIN="http://127.0.0.1:$S_PORT"
  S_SERVER_JS="$S_CURRENT/engine/apps/web/server.js"
  S_MEDIA_BUCKET="$(media_bucket)"
  # The app's one key reads and writes both buckets (DEPLOYMENT.md §6); its access key is the
  # site user's name, so the inventory and RustFS's user list say whose it is.
  S_KEY="$S_USER"
}
