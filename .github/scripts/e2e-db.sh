#!/usr/bin/env bash
# The e2e job's seeded database, kept as a snapshot so a push that changes nothing the seed
# depends on restores it in seconds instead of migrating and seeding it again (about 1m40s).
# e2e.yml caches the snapshot under `key`; on a miss it seeds as before and saves a new one. The
# snapshot is taken before any spec runs, so it holds the seed alone.
#
#   e2e-db.sh key                                      the cache key, on stdout
#   e2e-db.sh prepare <database> <dir> <hit>          restore if <hit> is "true", else seed + save
#   e2e-db.sh seed    <database> <dir>                db:fresh, the seed layers, publish the shop
#   e2e-db.sh save    <database> <dir>                pg_dump the database, tar the media dir
#   e2e-db.sh restore <database> <dir>                create the database and pg_restore it
#
# The key hashes git's own blob ids of every tracked file that decides what the seed writes — the
# CMS and the packages it imports (cache, config, media; tests excluded), the db tooling, the shop
# publish script, the lockfile (Payload's version) and this script — plus the Postgres major. It
# reads git's index, never the working tree's node_modules.
#
# Postgres runs on the runner itself (.github/actions/setup-postgres): pg_dump and pg_restore are
# the server's own tools, at its major version, reached through PGHOST/PGPORT/PGPASSWORD. Without S3 settings Payload writes uploads to the collection's local folder
# (`engine/packages/cms/media`, Payload's default staticDir), so the snapshot carries it too.
# DB_SUFFIX, PGHOST, PGPORT, POSTGRES_USER and PGPASSWORD come from the job (seed).
set -euo pipefail

POSTGRES_MAJOR=postgres-18
media_parent=engine/packages/cms
media=media

usage() {
  echo "usage: e2e-db.sh key | prepare <database> <dir> <hit> | seed|save|restore <database> <dir>" >&2
  exit 2
}

key() {
  local sum
  sum="$(git ls-files -s -- \
    engine/packages/cms engine/packages/cache engine/packages/config engine/packages/media \
    engine/tooling/db tests/e2e/support/publish-shop-products.ts pnpm-lock.yaml \
    .github/scripts/e2e-db.sh \
    ':!:*.test.*' ':!:*.test-support.*' | sha256sum | cut -c1-40)"
  echo "e2e-db-v2-$POSTGRES_MAJOR-$sum"
}

seed() {
  pnpm db:fresh --suffix "$DB_SUFFIX"
  pnpm data:seed --layer vocabulary --publish
  pnpm data:seed --layer gallery-sample --publish
  pnpm data:seed --layer shop
  DATABASE_URL="postgres://$POSTGRES_USER:$PGPASSWORD@$PGHOST:$PGPORT/$database" \
    NODE_ENV=development \
    pnpm --filter @engine/cms payload run "$PWD/tests/e2e/support/publish-shop-products.ts"
}

save() {
  mkdir -p "$dir"
  pg_dump -U postgres --format=custom "$database" >"$dir/db.dump"
  if [ -d "$media_parent/$media" ]; then
    tar -cf "$dir/media.tar" -C "$media_parent" "$media"
  fi
  ls -lh "$dir"
}

restore() {
  test -s "$dir/db.dump" || {
    echo "::error::no snapshot at $dir/db.dump"
    exit 1
  }
  createdb -U postgres "$database"
  pg_restore -U postgres --dbname="$database" --exit-on-error "$dir/db.dump"
  if [ -f "$dir/media.tar" ]; then
    mkdir -p "$media_parent"
    tar -xf "$dir/media.tar" -C "$media_parent"
  fi
  echo "restored $database from a $(du -h "$dir/db.dump" | cut -f1) snapshot"
}

[ "$#" -ge 1 ] || usage
command="$1"
shift
case "$command" in
  key)
    key
    ;;
  prepare)
    [ "$#" -eq 3 ] || usage
    database="$1" dir="$2" hit="$3"
    if [ "$hit" = "true" ]; then
      restore
    else
      seed
      save
    fi
    ;;
  seed | save | restore)
    [ "$#" -eq 2 ] || usage
    database="$1" dir="$2"
    "$command"
    ;;
  *)
    usage
    ;;
esac
