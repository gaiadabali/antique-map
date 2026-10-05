#!/usr/bin/env bash
# Provisions the Indies Platform on Helios (TASKS.md 3.1; DEPLOYMENT.md §2, §3, §5, §6, §8, §9):
# ONE site serving both hostnames — its site user and pm2 process, port, database and role,
# shared/.env and crontab — plus the host's RustFS (D12) with the media and masters buckets and
# the app's one key, staging's Mailpit (D13) and the nightly dump of the one database.
#
# Run as root ON the host, and only with the owner's go-ahead for that run (DEPLOYMENT.md §9):
#
#   bash scripts/ops/pack.sh | ssh helios 'bash -s -- --env staging --dry-run'   # review first
#   bash scripts/ops/pack.sh | ssh helios 'bash -s -- --env staging'             # then apply
#   bash scripts/ops/pack.sh | ssh helios 'bash -s -- --env staging --report'    # read-only
#   bash scripts/ops/pack.sh | ssh helios 'bash -s -- --env staging --verify-restart'
#
# pack.sh inlines lib/*.sh into one stream, so nothing is copied onto the host. From a checkout
# on the host, `bash scripts/ops/helios-provision.sh …` runs the same code.
#
# Idempotent: every step compares before it changes anything, and a second run prints
# "changes: 0". --dry-run prints every change as "WOULD …" (with the bytes of each file it would
# write) and makes none; neither it nor --report starts a pm2 daemon or tries a login. Checks
# that fail stop an apply run before its first change.
#
# What it never does: rewrite an existing shared/.env; restart a running app; touch another
# site; follow a symlink in a site's home (it refuses one, and writes there only as the site
# user); run a site user's binaries as root; alter a Postgres role it did not create (its own are
# COMMENT 'indies-provision'); drop a database, remove a site user or delete a bucket. It does
# not touch nginx — EXCEPT with --create-sites, where CloudPanel's clpctl writes the new site's
# vhost and reloads the host's shared nginx. The other hostnames in server_name and the /_media/
# location go in through CloudPanel's vhost editor; the report prints both and checks for them.
#
# Retiring the two-app shape (uig, uoei, ig_db, oei_db, ig-media, oei-media) is a hand-run
# sequence with its own evidence, never this script: docs/ops/helios-staging.md, "Retiring".
#
# The GDA deploy poller (gaiada-poll.timer, every minute, as root) acts on every CloudPanel site
# user: CloudPanel site user -> poller -> ~/releases/deploy_*, `current`, `pm2 reload <user>`.
# This script never fights it: it never moves `current` once it exists (the holding release is
# made only while `current` is absent), and it adopts the poller's pm2 daemon, never killing it
# on an apply. pm2 is the host's /usr/bin/pm2, the poller's and KOI's; none is installed (pm2.sh).
#
# CloudPanel's cron UI rewrites a site's crontab: if the managed block goes, --report says so
# (an ERROR), and re-running the script puts it back.
#
# Secrets: none in this repo. The .env skeleton leaves every app secret blank; the next run
# gives Postgres (as a SCRAM verifier) and RustFS whatever the operator put there (host-only on
# staging, D49). Infrastructure credentials — RustFS's root key, Mailpit's passwords — are made
# on the host into root-only files under /etc/indies and never printed.
#
# Options:
#   --env staging|production   required. production also needs --site, --shop-hosts,
#                              --gallery-hosts and --bucket-suffix: all new at cutover
#   --dry-run                  print every change, make none
#   --report                   only the read-only report
#   --site USER:PORT:DATABASE:ROLE   the site's spec (staging: uindies:4030:indies_db:indies)
#   --shop-hosts H[,H…]  --gallery-hosts H[,H…]   each site's hostnames, the first canonical
#                              (staging: old-east-indies.gaiada.com, indies-gallery.gaiada.com)
#   --bucket-suffix -SUFFIX    appended to every bucket name (production)
#   --pg-port N                the Postgres cluster (default 5432; required when several exist)
#   --rustfs-port N  --rustfs-console-port N  --mailpit-smtp-port N  --mailpit-ui-port N
#                              (defaults 4032, 4033, 4034, 4035)
#   --rustfs-size-gb N         the RustFS data image, made once (default 50)
#   --min-free-gb N  --min-free-pct N   refuse below either (defaults 20 GiB and 15%)
#   --create-sites             add the missing CloudPanel Node.js site with clpctl (touches nginx)
#   --verify-restart           restart this script's units one at a time and check each comes
#                              back (pm2 from dump.pm2, RustFS and its mount, Mailpit), the cron
#                              blocks and boot-time enablement; changes nothing else (verify.sh)
#   --vhost-dir DIR            where CloudPanel keeps vhosts (default /etc/nginx/sites-enabled)
#   --probe-public             the report also requests https://<domain>/api/health
#   --quiet-preview            a dry run lists changes without the file bytes
set -euo pipefail
shopt -s lastpipe

OPS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# >>> modules (pack.sh inlines these in this order)
# shellcheck source=lib/common.sh
. "$OPS_DIR/lib/common.sh"
# shellcheck source=lib/home.sh
. "$OPS_DIR/lib/home.sh"
# shellcheck source=lib/sites.sh
. "$OPS_DIR/lib/sites.sh"
# shellcheck source=lib/preflight.sh
. "$OPS_DIR/lib/preflight.sh"
# shellcheck source=lib/database.sh
. "$OPS_DIR/lib/database.sh"
# shellcheck source=lib/env-file.sh
. "$OPS_DIR/lib/env-file.sh"
# shellcheck source=lib/pm2.sh
. "$OPS_DIR/lib/pm2.sh"
# shellcheck source=lib/runtime.sh
. "$OPS_DIR/lib/runtime.sh"
# shellcheck source=lib/cron.sh
. "$OPS_DIR/lib/cron.sh"
# shellcheck source=lib/backup.sh
. "$OPS_DIR/lib/backup.sh"
# shellcheck source=lib/rustfs.sh
. "$OPS_DIR/lib/rustfs.sh"
# shellcheck source=lib/s3admin.sh
. "$OPS_DIR/lib/s3admin.sh"
# shellcheck source=lib/storage.sh
. "$OPS_DIR/lib/storage.sh"
# shellcheck source=lib/mailpit.sh
. "$OPS_DIR/lib/mailpit.sh"
# shellcheck source=lib/verify.sh
. "$OPS_DIR/lib/verify.sh"
# shellcheck source=lib/report.sh
. "$OPS_DIR/lib/report.sh"
# shellcheck source=lib/inventory.sh
. "$OPS_DIR/lib/inventory.sh"
# <<< modules

usage() {
  sed -n '2,/^set -euo/p' "${BASH_SOURCE[0]:-}" 2>/dev/null | sed '$d; s/^# \{0,1\}//' ||
    echo "usage: helios-provision.sh --env staging|production [--dry-run|--report] (see the header)"
}

REPORT_ONLY=0
parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --env) ENVIRONMENT="${2:-}" && shift ;;
      --dry-run) DRY_RUN=1 ;;
      --report) REPORT_ONLY=1 ;;
      --site) SITE_SPEC="${2:-}" && shift ;;
      --shop-hosts) SHOP_HOSTS="${2:-}" && shift ;;
      --gallery-hosts) GALLERY_HOSTS="${2:-}" && shift ;;
      --only | --gallery | --emporium | --replace-site)
        die "$1 is gone: one site serves both hostnames now (--site, --shop-hosts, --gallery-hosts)"
        ;;
      --bucket-suffix) BUCKET_SUFFIX="${2:-}" && shift ;;
      --pg-port) PG_PORT="${2:-}" PG_PORT_EXPLICIT=1 && shift ;;
      --rustfs-port) RUSTFS_PORT="${2:-}" && shift ;;
      --rustfs-console-port) RUSTFS_CONSOLE_PORT="${2:-}" && shift ;;
      --rustfs-size-gb) RUSTFS_SIZE_GB="${2:-}" && shift ;;
      --mailpit-smtp-port) MAILPIT_SMTP_PORT="${2:-}" && shift ;;
      --mailpit-ui-port) MAILPIT_UI_PORT="${2:-}" && shift ;;
      --min-free-gb) MIN_FREE_GB="${2:-}" && shift ;;
      --min-free-pct) MIN_FREE_PCT="${2:-}" && shift ;;
      --create-sites) CREATE_SITES=1 ;;
      --verify-restart) VERIFY_RESTART=1 ;;
      --vhost-dir) VHOST_DIR="${2:-}" && shift ;;
      --probe-public) PROBE_PUBLIC=1 ;;
      --quiet-preview) QUIET_PREVIEW=1 ;;
      -h | --help)
        usage
        exit 0
        ;;
      *) die "unknown option: $1 (--help)" ;;
    esac
    shift
  done
  local n
  for n in "$PG_PORT" "$RUSTFS_PORT" "$RUSTFS_CONSOLE_PORT" "$RUSTFS_SIZE_GB" "$MAILPIT_SMTP_PORT" \
    "$MAILPIT_UI_PORT" "$MIN_FREE_GB" "$MIN_FREE_PCT"; do
    [[ "$n" =~ ^[0-9]+$ ]] || die "not a number: '$n'"
  done
  [ "$RUSTFS_SIZE_GB" -ge 1 ] || die "--rustfs-size-gb is at least 1"
  if [ "$VERIFY_RESTART" = 1 ]; then
    if [ "$DRY_RUN" = 1 ] || [ "$REPORT_ONLY" = 1 ]; then
      die "--verify-restart restarts services: never with --dry-run or --report"
    fi
    [ "$CREATE_SITES" != 1 ] || die "--verify-restart runs alone: not with --create-sites"
  fi
}

summary() {
  say "summary ($ENVIRONMENT$(dry && printf ', dry run'))"
  if dry; then
    printf '   changes: %s would be made; none were\n' "$CHANGES"
  else
    printf '   changes: %s\n' "$CHANGES"
  fi
  printf '   warnings: %s   errors: %s\n' "$WARNINGS" "$ERRORS"
  if [ "$VERIFY_RESTART" = 1 ]; then printf '   verify-restart: %s passed, %s failed\n' "$VERIFY_PASS" "$VERIFY_FAIL"; fi
}

main() {
  parse_args "$@"
  set_profile
  root_tmp_init
  printf 'helios-provision %s — %s%s on %s\n' "$STAMP" "$ENVIRONMENT" \
    "$(dry && printf ' (dry run: nothing changes)')" "$(hostname)"

  host_preflight
  rustfs_preflight
  mailpit_preflight
  load_site
  site_preflight
  runtime_preflight

  if [ "$VERIFY_RESTART" = 1 ]; then
    if [ "$ERRORS" -gt 0 ]; then
      summary
      die "$ERRORS check(s) failed: --verify-restart restarted nothing"
    fi
    verify_restart
  elif [ "$REPORT_ONLY" = 0 ]; then
    if [ "$ERRORS" -gt 0 ] && ! dry; then
      summary
      die "$ERRORS check(s) failed: nothing was changed. Fix them, or --dry-run to see the plan."
    fi
    [ "$ERRORS" -gt 0 ] && note "checks failed: an apply run would stop here; the plan follows anyway"

    ensure_rustfs
    ensure_mailpit
    ensure_storage
    ensure_cloudpanel_site
    resolve_site_path
    if [ "$SITE_PLANNED" = 1 ]; then
      note "$S_USER does not exist yet: once clpctl makes the site, shared/.env, the holding release, the pm2 process and its unit, ~/bin, the key and the crontab are made as on a first run (a dry run after it shows them byte for byte)"
      ensure_database
    else
      ensure_env_file
      ensure_database
      ensure_app_key
      ensure_runtime
      ensure_cron
    fi
    ensure_backups
  fi

  [ "$REPORT_ONLY" = 0 ] || inventory_report
  host_report
  resolve_site_path
  site_report
  summary
  [ "$ERRORS" = 0 ]
}

main "$@" </dev/null
