#!/usr/bin/env bash
# Assembles the two per-brand subdirs release.yml's `artifact` job tars up (DEPLOYMENT.md §3), and
# e2e.yml and ci.yml's Lighthouse job boot from, so CI serves the tree a host will run:
#
#   <out>/<brand>/
#     engine/apps/<app>/server.js        the standalone server (Next nests it under the app's
#     engine/apps/<app>/.next/static     workspace path); `.next/static` and `public` beside it
#     engine/apps/<app>/node_modules/    sharp with its own dependencies (@img/*, detect-libc, …)
#     node_modules/                      what Next traced (pnpm's .pnpm layout)
#     brand/site/                        the brand folder: config, copy, assets
#
# so a host runs `node <current>/engine/apps/<app>/server.js` with BRAND_ROOT=<current>/brand
# (the loader reads <BRAND_ROOT>/site/brand.config.json — DEPLOYMENT.md §8).
#
# Checked against the real standalone output in node:22.13.0 (TASKS.md 4.4.a, 4.4.f): each subdir
# boots from the extracted tarball and `import('sharp')` loads from the server's folder.
#
# Usage: assemble-artifact.sh [out-dir]   (default: $RUNNER_TEMP/artifact). Run from the repo root
# after both apps' `next build`.
set -euo pipefail

STAGE="${1:-${RUNNER_TEMP:?RUNNER_TEMP or an out-dir argument is required}/artifact}"
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
  test -f "$brand_dir/site/brand.config.json" || {
    echo "::error::$brand_dir/site/brand.config.json missing — a release ships each brand's own config"
    exit 1
  }

  mkdir -p "$out"
  cp -r "$standalone"/. "$out"/

  # Next nests server.js under the app's path from the tracing root (the workspace root:
  # outputFileTracingRoot in next.config.ts), so the path is fixed — assert it, never search.
  local server_dir="$out/$app_dir"
  test -f "$server_dir/server.js" || {
    echo "::error::no $app_dir/server.js in the standalone output — outputFileTracingRoot changed?"
    exit 1
  }

  # Tracing does not follow files that are only ever served, never imported.
  cp -r "$app_dir/.next/static" "$server_dir/.next/static"
  if [ -d "$app_dir/public" ]; then
    cp -r "$app_dir/public" "$server_dir/public"
  fi

  # sharp is a native addon the app declares but no traced module imports by name, so the traced
  # tree has no `node_modules/sharp` a `require('sharp')` from the app could reach. pnpm keeps
  # sharp's own dependencies (the platform's @img/* binaries, detect-libc, semver, …) as siblings
  # of it in its store folder: copy that folder's contents, links dereferenced, beside the server.
  local sharp_link="$app_dir/node_modules/sharp" sharp_real
  test -e "$sharp_link" || {
    echo "::error::$sharp_link missing — the app must depend on sharp (Payload's and next/image's resizer)"
    exit 1
  }
  sharp_real="$(readlink -f "$sharp_link")"
  mkdir -p "$server_dir/node_modules"
  # Entry by entry (a scope such as @img one level down), never over a name the trace already
  # linked there: the traced link is the version the app was built against. (No `cp -n`: its
  # exit status differs between coreutils 9.1 and 9.4.)
  local entry name
  for entry in "$(dirname "$sharp_real")"/* "$(dirname "$sharp_real")"/@*/*; do
    [ -e "$entry" ] || continue
    name="${entry#"$(dirname "$sharp_real")"/}"
    case "$name" in @*/*) ;; @*) continue ;; esac
    [ -e "$server_dir/node_modules/$name" ] && continue
    mkdir -p "$(dirname "$server_dir/node_modules/$name")"
    cp -rL "$entry" "$server_dir/node_modules/$name"
  done
  local sharp_version
  sharp_version="$(cd "$server_dir" && node -e "import('sharp').then((s) => console.log(s.default.versions.sharp + ' (libvips ' + s.default.versions.vips + ')'))")" || {
    echo "::error::sharp does not load from $server_dir — its native binary or a dependency is missing"
    exit 1
  }

  # The brand folder beside the build, never baked into it: BRAND_ROOT=<release>/brand.
  mkdir -p "$out/brand"
  cp -r "$brand_dir/site" "$out/brand/site"

  echo "$out_name assembled: $(du -sh "$out" | cut -f1), sharp $sharp_version, entry $app_dir/server.js"
}

assemble_one engine/apps/gallery indies-gallery indies-gallery
assemble_one engine/apps/emporium old-east-indies old-east-indies

echo "artifact staged at $STAGE"
