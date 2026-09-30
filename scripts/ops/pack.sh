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

pack() {
  local rev
  rev="$(git -C "$OPS_DIR" rev-parse --short HEAD 2>/dev/null || printf 'unknown')"
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
  printf '\n# --- helios-provision.sh ---\n'
  sed -n '/^# <<< modules/,$p' "$ENTRY" | sed '1d'
}

out="$(pack)"
printf '%s\n' "$out"
printf 'pack.sh: sha256 %s\n' "$(printf '%s\n' "$out" | sha256sum | cut -d' ' -f1)" >&2
