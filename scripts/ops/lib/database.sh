# shellcheck shell=bash
# One database and one role per brand (DEPLOYMENT.md §2), in the host's Postgres.
#
# The role has LOGIN and nothing else: no CREATEDB, because Payload creates a database it cannot
# find, and a mistyped DATABASE_URL would then boot green on an empty one (4.8's independent
# review, S4); no CREATEROLE, SUPERUSER, REPLICATION or BYPASSRLS. PUBLIC may not connect, so
# one brand's role can never open the other brand's database.
#
# The password is never made here: shared/.env is written with it blank, the operator puts the
# Infisical value in DATABASE_URL, and the next run sets the role to it — only when a login with
# it fails on authentication. Identifiers are validated in sites.sh, so they are safe in SQL.

pg() { runuser -u postgres -- psql -X -q -At -v ON_ERROR_STOP=1 -d postgres -c "$1"; }

role_exists() { [ "$(pg "select count(*) from pg_roles where rolname = '$1'")" = 1 ]; }
db_owner() { pg "select pg_get_userbyid(datdba) from pg_database where datname = '$1'"; }

ROLE_FLAGS_WANTED='t|f|f|f|f|f'
role_flags() {
  pg "select concat_ws('|', rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls)
      from pg_roles where rolname = '$1'"
}

db_preflight() {
  [ -n "$PG_PORT" ] || return 0
  local owner
  owner="$(db_owner "$S_DB")"
  if [ -n "$owner" ] && [ "$owner" != "$S_ROLE" ]; then
    fail "database $S_DB exists but is owned by $owner, not $S_ROLE: another site's? (nothing is changed)"
  fi
  if role_exists "$S_ROLE" && [ -z "$owner" ]; then
    local elsewhere
    elsewhere="$(pg "select string_agg(datname, ',') from pg_database where pg_get_userbyid(datdba) = '$S_ROLE'")"
    [ -z "$elsewhere" ] || fail "role $S_ROLE exists and owns $elsewhere, not $S_DB: another site's?"
  fi
}

ensure_database() {
  say "$S_APP: Postgres $S_DB / $S_ROLE"
  [ -n "$PG_PORT" ] || {
    fail "Postgres unreachable; skipped"
    return 0
  }
  if role_exists "$S_ROLE"; then
    local flags
    flags="$(role_flags "$S_ROLE")"
    if [ "$flags" = "$ROLE_FLAGS_WANTED" ]; then
      ok "role $S_ROLE: LOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS"
    else
      act "reset role $S_ROLE to LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS (was login|super|createdb|createrole|replication|bypassrls = $flags)" \
        pg "alter role $S_ROLE login nosuperuser nocreatedb nocreaterole noreplication nobypassrls"
    fi
  else
    act "create role $S_ROLE (LOGIN, NOCREATEDB, no password until shared/.env has one)" \
      pg "create role $S_ROLE login nosuperuser nocreatedb nocreaterole noreplication nobypassrls"
  fi
  if [ -n "$(db_owner "$S_DB")" ]; then
    ok "database $S_DB exists, owned by $S_ROLE"
  else
    act "create database $S_DB owned by $S_ROLE (UTF8, from template0)" \
      pg "create database $S_DB owner $S_ROLE template template0 encoding 'UTF8'"
  fi
  if dry && [ -z "$(db_owner "$S_DB")" ]; then
    act "revoke CONNECT and TEMPORARY on $S_DB from PUBLIC" true
  elif [ "$(pg "select count(*) from pg_database d, aclexplode(coalesce(d.datacl, acldefault('d', d.datdba))) a
               where d.datname = '$S_DB' and a.grantee = 0")" != 0 ]; then
    act "revoke CONNECT and TEMPORARY on $S_DB from PUBLIC (only $S_ROLE connects)" \
      pg "revoke all on database $S_DB from public"
  else
    ok "PUBLIC holds no privilege on $S_DB"
  fi
  converge_password
}

# The password in shared/.env's DATABASE_URL, when there is one; empty otherwise.
env_db_password() {
  [ -f "$S_ENV" ] || return 0
  local url creds
  url="$(env_get "$S_ENV" DATABASE_URL)"
  creds="${url#*://}"
  case "$creds" in *@*) creds="${creds%%@*}" ;; *) return 0 ;; esac
  case "$creds" in *:*) printf '%s' "${creds#*:}" ;; esac
}

converge_password() {
  local pw out
  pw="$(env_db_password)"
  if [ -z "$pw" ]; then
    note "DATABASE_URL has no password yet: put the Infisical value between ':' and '@' in $S_ENV, then re-run"
    return 0
  fi
  if ! [[ "$pw" =~ ^[A-Za-z0-9]{32,}$ ]]; then
    fail "DATABASE_URL's password must be 32+ letters and digits (URL-safe, nothing to encode); left unset"
    return 0
  fi
  if dry && ! role_exists "$S_ROLE"; then
    act "set role $S_ROLE's password from $S_ENV" true
    return 0
  fi
  if out="$(PGPASSWORD="$pw" PGCONNECT_TIMEOUT=5 psql -X -q -At -h 127.0.0.1 -p "$PG_PORT" \
    -U "$S_ROLE" -d "$S_DB" -c 'select 1' 2>&1)"; then
    ok "$S_ROLE logs in to $S_DB on 127.0.0.1:$PG_PORT with the password in $S_ENV"
  elif grep -q 'password authentication failed' <<<"$out"; then
    act "set role $S_ROLE's password from $S_ENV" set_role_password "$pw"
  else
    fail "$S_ROLE cannot log in over 127.0.0.1:$PG_PORT for a reason no password fixes: $(head -n 1 <<<"$out")"
  fi
}

# The password travels on stdin, never in argv; this session logs no statement, so neither the
# server log nor an error report carries it. The server stores its SCRAM verifier.
set_role_password() {
  printf "set log_statement = 'none'; set log_min_duration_statement = -1; set log_min_error_statement = panic;
alter role %s password '%s';\n" "$S_ROLE" "$1" |
    runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -d postgres >/dev/null
}
