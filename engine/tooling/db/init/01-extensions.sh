#!/bin/sh
# Runs once, on first container start (docker-entrypoint-initdb.d). Enables the
# two extensions every brand database needs (unaccent for the gazetteer and
# search normalisation, pg_trgm for fuzzy/facet matching) in template1 too, so
# every database `CREATE DATABASE` makes afterwards — including every worktree's
# suffixed brand databases created later by `db:fresh` — has them without a
# per-database migration step (TASKS.md 2.1.a).
set -eu

for db in template1 "$POSTGRES_DB"; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$db" <<-SQL
		CREATE EXTENSION IF NOT EXISTS unaccent;
		CREATE EXTENSION IF NOT EXISTS pg_trgm;
	SQL
done
