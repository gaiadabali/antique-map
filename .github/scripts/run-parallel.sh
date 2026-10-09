#!/usr/bin/env bash
# Runs independent preparation commands at the same time and fails if any of them failed, so a
# job's wall clock is its slowest command, not their sum. Each command's output goes to its own
# log, printed afterwards in a collapsed group (a failed one in full, flagged), so the Actions log
# stays readable.
#
#   run-parallel.sh <label> <command> [<label> <command> ...]
#
# Each <command> is one bash string, run with `set -euo pipefail` from the current directory with
# the step's environment. Only pair commands that touch nothing the others touch (e.g. the app's
# build, which reads no database, beside the database's seed).
set -uo pipefail

if [ "$#" -lt 2 ] || [ $(($# % 2)) -ne 0 ]; then
  echo "usage: run-parallel.sh <label> <command> [<label> <command> ...]" >&2
  exit 2
fi

logs="$(mktemp -d "${RUNNER_TEMP:-/tmp}/parallel.XXXXXX")"
labels=() pids=()
while [ "$#" -gt 0 ]; do
  i="${#labels[@]}"
  (
    start=$SECONDS
    bash -c "set -euo pipefail; $2" >"$logs/$i.log" 2>&1
    rc=$?
    echo $((SECONDS - start)) >"$logs/$i.took"
    exit "$rc"
  ) &
  labels+=("$1") pids+=("$!")
  echo "started: $1"
  shift 2
done

failed=0
for i in "${!pids[@]}"; do
  if wait "${pids[$i]}"; then rc=0; else rc=$?; failed=1; fi
  took="$(cat "$logs/$i.took" 2>/dev/null || echo '?')"
  if [ "$rc" -eq 0 ]; then
    echo "::group::${labels[$i]}: ok in ${took}s"
    cat "$logs/$i.log"
    echo "::endgroup::"
  else
    echo "::error::${labels[$i]} failed (exit $rc, ${took}s)"
    cat "$logs/$i.log"
  fi
done
exit "$failed"
