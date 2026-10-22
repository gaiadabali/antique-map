#!/usr/bin/env bash
# Loads the staging staff credentials into this process only (never printed), then runs "$@".
set -a
for try in 1 2 3; do
  eval "$(ssh helios 'cat /etc/indies/staging-admin/e2e-users.env')"
  [ -n "$E2E_OWNER_EMAIL" ] && break
  sleep 2
done
set +a
exec "$@"
