#!/usr/bin/env bash
# Assembles the one release subdirectory, `web/`, that release.yml's `artifact` job tars up
# (DEPLOYMENT.md §3) and e2e.yml and ci.yml's Lighthouse job boot from, so CI serves the tree a
# host will run:
#
#   <out>/web/
#     engine/apps/web/server.js        the standalone server (Next nests it under the app's
#     engine/apps/web/.next/static     workspace path); `.next/static` and `public` beside it
#     engine/apps/web/node_modules/    sharp with its own dependencies (@img/*, detect-libc, …)
#     node_modules/                    what Next traced (pnpm's .pnpm layout)
#     <brand>/site/                    each brand folder's site/ (config, copy, assets), until
#                                      TASKS.md 2.2–2.3 move the sites into the app
#
# so a host runs `node <current>/engine/apps/web/server.js`. Until the host picks the site (2.2)
# a process still serves one brand: BRAND=<slug>, with BRAND_ROOT=<current>/<slug> — or unset, as
# the loader finds `<slug>/site` from the server's folder upward (@engine/config/loader paths).
#
# Every repository-root folder holding `site/brand.config.json` ships — never a hard-coded list,
# so the day 2.3 dissolves the brand folders this copies none and needs no edit. The synthetic
# `test` brand keeps one config per storefront and ships in no release.
#
# Usage: assemble-artifact.sh [out-dir]   (default: $RUNNER_TEMP/artifact). Run from the repo root
# after the app's `next build`.
set -euo pipefail

STAGE="${1:-${RUNNER_TEMP:?RUNNER_TEMP or an out-dir argument is required}/artifact}"
APP_DIR=engine/apps/web
OUT="$STAGE/web"
STANDALONE="$APP_DIR/.next/standalone"
rm -rf "$STAGE"
mkdir -p "$OUT"

test -d "$STANDALONE" || {
  echo "::error::$STANDALONE missing — did the build step run and produce output: 'standalone'?"
  exit 1
}
cp -r "$STANDALONE"/. "$OUT"/

# Next nests server.js under the app's path from the tracing root (the workspace root:
# outputFileTracingRoot in next.config.ts), so the path is fixed — assert it, never search.
SERVER_DIR="$OUT/$APP_DIR"
test -f "$SERVER_DIR/server.js" || {
  echo "::error::no $APP_DIR/server.js in the standalone output — outputFileTracingRoot changed?"
  exit 1
}

# Tracing does not follow files that are only ever served, never imported.
cp -r "$APP_DIR/.next/static" "$SERVER_DIR/.next/static"
if [ -d "$APP_DIR/public" ]; then
  cp -r "$APP_DIR/public" "$SERVER_DIR/public"
fi

# sharp is a native addon the app declares but no traced module imports by name, so the traced
# tree has no `node_modules/sharp` a `require('sharp')` from the app could reach. pnpm keeps
# sharp's own dependencies (the platform's @img/* binaries, detect-libc, semver, …) as siblings
# of it in its store folder: copy that folder's contents, links dereferenced, beside the server.
sharp_link="$APP_DIR/node_modules/sharp"
test -e "$sharp_link" || {
  echo "::error::$sharp_link missing — the app must depend on sharp (Payload's and next/image's resizer)"
  exit 1
}
sharp_store="$(dirname "$(readlink -f "$sharp_link")")"
mkdir -p "$SERVER_DIR/node_modules"
# Entry by entry (a scope such as @img one level down), never over a name the trace already
# linked there: the traced link is the version the app was built against. (No `cp -n`: its
# exit status differs between coreutils 9.1 and 9.4.)
for entry in "$sharp_store"/* "$sharp_store"/@*/*; do
  [ -e "$entry" ] || continue
  name="${entry#"$sharp_store"/}"
  case "$name" in @*/*) ;; @*) continue ;; esac
  [ -e "$SERVER_DIR/node_modules/$name" ] && continue
  mkdir -p "$(dirname "$SERVER_DIR/node_modules/$name")"
  cp -rL "$entry" "$SERVER_DIR/node_modules/$name"
done
sharp_version="$(cd "$SERVER_DIR" && node -e "import('sharp').then((s) => console.log(s.default.versions.sharp + ' (libvips ' + s.default.versions.vips + ')'))")" || {
  echo "::error::sharp does not load from $SERVER_DIR — its native binary or a dependency is missing"
  exit 1
}

# The brand folders beside the build, never baked into it.
brands=()
for config in */site/brand.config.json; do
  [ -f "$config" ] || continue
  brand="${config%%/*}"
  mkdir -p "$OUT/$brand"
  cp -r "$brand/site" "$OUT/$brand/site"
  brands+=("$brand")
done

echo "web assembled: $(du -sh "$OUT" | cut -f1), sharp $sharp_version, entry $APP_DIR/server.js, brands: ${brands[*]:-none}"
echo "artifact staged at $STAGE"
