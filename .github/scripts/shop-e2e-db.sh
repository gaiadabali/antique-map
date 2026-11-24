#!/usr/bin/env bash
# The shop app's e2e database (TASKS.md 24.3.b), kept as a snapshot the way e2e-db.sh keeps today's
# app's: shop.yml's build job seeds it on a cache miss — beside the build, which reads no database
# — and saves it; the e2e and Lighthouse jobs restore the same snapshot. The snapshot is taken
# before any spec runs, so it holds the seed alone.
#
#   shop-e2e-db.sh key                         the cache key, on stdout
#   shop-e2e-db.sh seed    <database> <dir>    db:fresh --app shop, the light seed, the fixtures
#   shop-e2e-db.sh save    <database> <dir>    pg_dump the database, tar the media dir
#   shop-e2e-db.sh restore <database> <dir>    create the database and pg_restore it
#
# The seed is the light one, not `pnpm data:seed --app shop` whole (about 18 minutes: the 156
# designs' pictures and their web sizes): the shop's vocabulary (published), the mock shop's sheets
# (80 products, 120 stores, their stock, the welcome discount), the built-in pages (published), and
# shop-e2e-fixtures.ts — the staff, three orders, a picture on every product and published, two
# products made from an original. About as long as today's e2e seed, so it fits beside the build.
#
# The key hashes git's blob ids of every tracked file that decides what that seed writes — cms-shop
# and the packages it imports (cms-core, cache, config, media), the storefront (the pages' seed and
# copy), the committed picture under cms's seed data, the e2e accounts, the db tooling, the root
# package.json (data:seed, db:fresh), the lockfile and these two scripts; tests excluded — plus the
# Postgres major.
#
# Without S3 settings Payload writes uploads to `media/` under the writer's working directory: the
# seed runs from cms-shop's folder, so `engine/packages/cms-shop/media`, which the snapshot carries
# (start-server.sh's SERVER_MEDIA_DIR hands it to the server). DB_SUFFIX, PGHOST, PGPORT,
# POSTGRES_USER and PGPASSWORD come from the job.
set -euo pipefail

POSTGRES_MAJOR=postgres-18
media_parent=engine/packages/cms-shop
media=media

usage() {
  echo "usage: shop-e2e-db.sh key | seed|save|restore <database> <dir>" >&2
  exit 2
}

key() {
  local sum
  sum="$(git ls-files -s -- \
    engine/packages/cms-shop engine/packages/cms-core engine/packages/cache \
    engine/packages/config engine/packages/media engine/packages/storefront \
    engine/packages/cms/src/seed/gallery/data/images/2-5.jpg tests/e2e/admin/accounts.ts \
    engine/tooling/db package.json pnpm-lock.yaml \
    .github/scripts/shop-e2e-db.sh .github/scripts/shop-e2e-fixtures.ts \
    ':!:*.test.*' ':!:*.test-support.*' | sha256sum | cut -c1-40)"
  echo "shop-e2e-db-v1-$POSTGRES_MAJOR-$sum"
}

seed() {
  export DATABASE_URL="postgres://$POSTGRES_USER:$PGPASSWORD@$PGHOST:$PGPORT/$database"
  pnpm db:fresh --app shop --suffix "$DB_SUFFIX"
  pnpm data:seed --app shop --layer vocabulary --publish
  pnpm data:seed --app shop --layer shop
  pnpm data:seed --app shop --layer pages --publish
  pnpm --filter @engine/cms-shop exec payload run "$PWD/.github/scripts/shop-e2e-fixtures.ts"
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
  seed | save | restore)
    [ "$#" -eq 2 ] || usage
    database="$1" dir="$2"
    "$command"
    ;;
  *)
    usage
    ;;
esac
