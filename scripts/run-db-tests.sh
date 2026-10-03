#!/usr/bin/env bash
# Worker helper: run the database test suite with the local dev stack's Postgres.
export CMS_TEST_POSTGRES_URL="postgres://postgres:postgres@localhost:5432/postgres"
exec pnpm vitest run --project packages --maxWorkers=1 .db.test "$@"
