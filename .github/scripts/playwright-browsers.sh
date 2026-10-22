#!/usr/bin/env bash
# Playwright's Chromium for the e2e job, without `--with-deps` unless it is needed. The runner image
# already carries every library Chromium links against, so `--with-deps` only adds an `apt-get
# update` — 5 s on a good day, 2.5 min on a slow mirror (CI run 37986527608), on the job's critical
# path. The browser itself comes from e2e.yml's cache (~/.cache/ms-playwright, keyed on
# Playwright's version) when it can; the system libraries are installed only if a binary misses one.
set -euo pipefail

pnpm exec playwright install chromium

missing=0
while IFS= read -r binary; do
  if ldd "$binary" | grep -q 'not found'; then
    echo "missing libraries for $binary:"
    ldd "$binary" | grep 'not found' || true
    missing=1
  fi
done < <(find "${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}" -type f \
  \( -name chrome -o -name chrome-headless-shell -o -name headless_shell \) -perm -u+x)

if [ "$missing" = 1 ]; then
  echo "installing Chromium's system libraries"
  pnpm exec playwright install-deps chromium
else
  echo "Chromium's system libraries are all present: no apt"
fi
