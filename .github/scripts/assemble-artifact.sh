#!/usr/bin/env bash
# Assembles the two per-brand subdirs release.yml's `artifact` job tars up
# (TASKS.md 2.3.b, DEPLOYMENT.md §3): each app's `next build --standalone`
# output, plus what Next's tracing does not follow — `.next/static`, `public`,
# and `sharp`/`@img` (native addons, served/required but never imported) —
# plus the brand's own `site/` folder (config, copy, assets; BRAND_ROOT at
# runtime, DEPLOYMENT.md §2).
#
# UNVERIFIED AGAINST A REAL BUILD: engine/apps/{gallery,emporium} are empty
# until phase 4 (App shells) lands, so this has never run against an actual
# `next build --standalone` output in this monorepo. It finds `server.js`
# under each app's `.next/standalone` rather than hard-coding a path, so it
# tolerates the workspace-relative nesting pnpm-monorepo standalone builds
# produce — but re-verify the assembled tree the first time an app exists
# (2.3.d's Check: "the tarball holds indies-gallery/ ... with their brand
# site/ folders").
set -euo pipefail

STAGE="$RUNNER_TEMP/artifact"
rm -rf "$STAGE"
mkdir -p "$STAGE"

assemble_one() {
  local app_dir="$1" brand_dir="$2" out_name="$3"
  local standalone="$app_dir/.next/standalone"
  local out="$STAGE/$out_name"

  test -d "$standalone" || {
    echo "::error::$standalone missing — did the build step run and produce output: 'standalone'?"
    exit 1
  }

  mkdir -p "$out"
  cp -r "$standalone"/. "$out"/

  # The server.js Next traced — may be nested under the app's
  # workspace-relative path (pnpm monorepo standalone output), never at a
  # fixed depth, so find it rather than assume one.
  local server_js
  server_js="$(find "$out" -maxdepth 4 -name server.js -print -quit)"
  test -n "$server_js" || {
    echo "::error::no server.js under $out — standalone output looks unlike a Next build"
    exit 1
  }
  local server_dir
  server_dir="$(dirname "$server_js")"

  # Tracing does not follow files that are only ever served, not imported.
  cp -r "$app_dir/.next/static" "$server_dir/.next/static"
  if [ -d "$app_dir/public" ]; then
    cp -r "$app_dir/public" "$server_dir/public"
  fi

  # sharp/@img are native addons `output: standalone` traces incompletely —
  # copied in beside wherever node_modules landed in the traced tree.
  local node_modules
  node_modules="$(find "$out" -maxdepth 4 -type d -name node_modules -print -quit)"
  if [ -n "$node_modules" ]; then
    for pkg in sharp @img; do
      if [ -d "node_modules/$pkg" ] && [ ! -e "$node_modules/$pkg" ]; then
        cp -r "node_modules/$pkg" "$node_modules/$pkg"
      fi
    done
  fi

  # BRAND_ROOT at runtime (DEPLOYMENT.md §2) — the brand folder ships beside
  # the server, not baked into it, so `BRAND` alone selects it at boot.
  cp -r "$brand_dir" "$out/site-root"

  echo "$out_name assembled: $(du -sh "$out" | cut -f1)"
}

assemble_one engine/apps/gallery indies-gallery/site indies-gallery
assemble_one engine/apps/emporium old-east-indies/site old-east-indies

echo "artifact staged at $STAGE"
find "$STAGE" -maxdepth 2
