#!/usr/bin/env bash
# Prints helios-provision.sh with its lib/*.sh modules inlined, as one script for
# `ssh helios 'bash -s -- …'`, so nothing has to be copied onto the host first:
#
#   bash scripts/ops/pack.sh | ssh helios 'bash -s -- --env staging --dry-run'
#
# The packed script's SHA-256 goes to stderr: the reviewer and the operator compare it, so
# what runs is what was reviewed. It runs from any checkout; it contacts nothing.
set -euo pipefail

OPS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENTRY="$OPS_DIR/helios-provision.sh"

# The storage step's documents (lib/storage.sh), as a function that writes them out on the host:
# the policy documents @engine/media's storage:policies applies, so both tools apply one text.
POLICIES="${INDIES_POLICIES_DIR:-$OPS_DIR/../../engine/packages/media/src/storage/policies}"
bundle() {
  local name f
  printf '\n# --- storage bundle: engine/packages/media/src/storage/policies ---\n'
  printf 'storage_bundle_packed() {\n'
  for name in media-public-read media-writer masters-writer; do
    f="$POLICIES/$name.json"
    [ -f "$f" ] || {
      echo "pack.sh: no policy document $f" >&2
      return 1
    }
    if grep -qx 'INDIES_BUNDLE_EOF' "$f"; then
      echo "pack.sh: $f holds the bundle's delimiter line" >&2
      return 1
    fi
    printf "cat >\"\$1/%s.json\" <<'INDIES_BUNDLE_EOF'\n%s\nINDIES_BUNDLE_EOF\n" "$name" "$(cat "$f")"
  done
  printf '}\n'
}

pack() {
  local rev
  rev="$(git -C "$OPS_DIR" rev-parse --short HEAD 2>/dev/null || printf 'unknown')"
  # A tree with uncommitted changes under scripts/ops or the policy documents is labelled, so a
  # sha that was reviewed can never be confused with one packed from edits nobody saw.
  if [ -n "$(git -C "$OPS_DIR" status --porcelain -- . "$POLICIES" 2>/dev/null)" ]; then
    rev="$rev-dirty"
    echo "pack.sh: WARNING: scripts/ops has uncommitted changes; packed as $rev" >&2
  fi

  # Everything before the module block, minus the line that finds lib/ on disk.
  sed -n '1,/^# >>> modules/p' "$ENTRY" | sed '$d' | grep -v '^OPS_DIR='
  printf '# --- packed by scripts/ops/pack.sh at %s: the modules follow, inlined ---\n' "$rev"
  local modules module
  # shellcheck disable=SC2016 # the patterns match a literal $OPS_DIR in the entry script
  modules="$(sed -nE 's|^\. "\$OPS_DIR/(lib/[a-z0-9-]+\.sh)"$|\1|p' "$ENTRY")"
  [ "$(wc -l <<<"$modules")" -ge 10 ] || {
    echo "pack.sh: found only these modules in $ENTRY: $modules" >&2
    return 1
  }
  for module in $modules; do
    printf '\n# --- %s ---\n' "$module"
    grep -v '^# shellcheck shell=bash$' "$OPS_DIR/$module"
  done
  bundle || return 1
  printf '\n# --- helios-provision.sh ---\n'
  sed -n '/^# <<< modules/,$p' "$ENTRY" | sed '1d'
}

out="$(pack)"
printf '%s\n' "$out"
printf 'pack.sh: sha256 %s\n' "$(printf '%s\n' "$out" | sha256sum | cut -d' ' -f1)" >&2
