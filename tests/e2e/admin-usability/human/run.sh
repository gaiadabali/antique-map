#!/usr/bin/env bash
# The timed test at a person's pace, from the repo root: bash tests/e2e/admin-usability/human/run.sh [playwright args]
# Staff credentials load from Helios into this process only (../run.sh), never printed. One run tag for the
# whole invocation, so T2 finds T1's antique and T12 finds T8's delivered order.
export MSYS_NO_PATHCONV=1
export USABILITY_RUN="${USABILITY_RUN:-$(date -u +%Y%m%d%H%M)}"
exec bash tests/e2e/admin-usability/run.sh node node_modules/@playwright/test/cli.js test \
  -c tests/e2e/admin-usability/human/playwright.config.ts "$@"
