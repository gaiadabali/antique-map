#!/usr/bin/env bash
# Runs the 10.4 proxy suite from the repo root: bash tests/e2e/admin-usability/pw.sh [playwright args]
# Staff credentials are loaded from Helios into this process only (run.sh) and never printed.
# One run tag for the whole invocation, so later recipes find what earlier ones created.
export MSYS_NO_PATHCONV=1
export USABILITY_RUN="${USABILITY_RUN:-$(date -u +%Y%m%d%H%M)}"
exec bash tests/e2e/admin-usability/run.sh node node_modules/@playwright/test/cli.js test \
  -c tests/e2e/admin-usability/playwright.config.ts "$@"
