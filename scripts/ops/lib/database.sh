# shellcheck shell=bash
# One database and one role per brand (DEPLOYMENT.md §2), in the named Postgres cluster.
#
# The role has LOGIN and nothing else: no CREATEDB, because Payload creates a database it cannot
# find, and a mistyped DATABASE_URL would then boot green on an empty one (4.8's independent
# review, S4); no CREATEROLE, SUPERUSER, REPLICATION or BYPASSRLS. CONNECTION LIMIT 20: pg's pool
# default is 10 per process (cms db/adapter.ts), and a pm2 reload briefly runs the old and the
# new process side by side, so 20 is the most one brand can need, of the host's 100 connections.
# PUBLIC may not connect, so one brand's role never opens the other brand's database.
#
# Ours only (should-fix 3): a role this script creates is marked COMMENT 'indies-provision'. An
# existing role without the mark, or with it but without its database, is someone else's or a
# half-finished run: the script fails and changes nothing, rather than alter or adopt it.
#
# The password is never made here: shared/.env is written with it blank, the operator puts the
# Infisical value in DATABASE_URL, and the next run stores its SCRAM-SHA-256 verifier, computed
# here (RFC 5802/7677), so no plaintext reaches the server, a log or pg_stat_statements. Whether
# it already matches is decided by recomputing the stored verifier — no login is ever tried with
# a password that could fail. Identifiers are validated in sites.sh, so they are safe in SQL.

ROLE_MARK=indies-provision
ROLE_CONN_LIMIT=20

pg() { runuser -u postgres -- psql -X -q -At -v ON_ERROR_STOP=1 -p "$PG_PORT" -d postgres -c "$1"; }

role_exists() { [ "$(pg "select count(*) from pg_roles where rolname = '$1'")" = 1 ]; }
role_mark() { pg "select coalesce(shobj_description(oid, 'pg_authid'), '') from pg_roles where rolname = '$1'"; }
db_owner() { pg "select pg_get_userbyid(datdba) from pg_database where datname = '$1'"; }

ROLE_FLAGS_WANTED="t|f|f|f|f|f|$ROLE_CONN_LIMIT"
role_flags() {
  pg "select concat_ws('|', rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolreplication,
      rolbypassrls, rolconnlimit) from pg_roles where rolname = '$1'"
}

db_preflight() {
  [ "$PG_OK" = 1 ] || return 0
  local owner
  owner="$(db_owner "$S_DB")"
  if role_exists "$S_ROLE"; then
    if [ "$(role_mark "$S_ROLE")" != "$ROLE_MARK" ]; then
      fail "role $S_ROLE exists and is not this script's (no '$ROLE_MARK' comment): not ours to change — pick another role name"
    elif [ -z "$owner" ]; then
      fail "role $S_ROLE exists without $S_DB (a run stopped between the two?): create $S_DB owned by $S_ROLE by hand, or drop the role, then re-run"
    fi
  fi
  if [ -n "$owner" ] && [ "$owner" != "$S_ROLE" ]; then
    fail "database $S_DB exists but is owned by $owner, not $S_ROLE: another site's? (nothing is changed)"
  fi
}

create_role_and_db() {
  pg "create role $S_ROLE login nosuperuser nocreatedb nocreaterole noreplication nobypassrls connection limit $ROLE_CONN_LIMIT"
  pg "comment on role $S_ROLE is '$ROLE_MARK'"
  pg "create database $S_DB owner $S_ROLE template template0 encoding 'UTF8'"
}

ensure_database() {
  say "$S_APP: Postgres $S_DB / $S_ROLE"
  if [ "$PG_OK" != 1 ]; then
    fail "Postgres unreachable or not the named cluster; skipped"
    return 0
  fi
  if role_exists "$S_ROLE"; then
    local flags
    flags="$(role_flags "$S_ROLE")"
    if [ "$flags" = "$ROLE_FLAGS_WANTED" ]; then
      ok "role $S_ROLE ($ROLE_MARK): LOGIN only, CONNECTION LIMIT $ROLE_CONN_LIMIT"
    elif [ "$(role_mark "$S_ROLE")" = "$ROLE_MARK" ]; then
      act "reset role $S_ROLE to LOGIN only, CONNECTION LIMIT $ROLE_CONN_LIMIT (was login|super|createdb|createrole|replication|bypassrls|connlimit = $flags)" \
        pg "alter role $S_ROLE login nosuperuser nocreatedb nocreaterole noreplication nobypassrls connection limit $ROLE_CONN_LIMIT"
    fi
    [ -n "$(db_owner "$S_DB")" ] && ok "database $S_DB exists, owned by $S_ROLE"
  else
    act "create role $S_ROLE (LOGIN only, CONNECTION LIMIT $ROLE_CONN_LIMIT, marked '$ROLE_MARK', no password yet) and database $S_DB owned by it (UTF8, from template0)" \
      create_role_and_db
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
  user_exists_path "$S_ENV" || return 0
  local url creds
  url="$(env_get "$S_ENV" DATABASE_URL)"
  creds="${url#*://}"
  case "$creds" in *@*) creds="${creds%%@*}" ;; *) return 0 ;; esac
  case "$creds" in *:*) printf '%s' "${creds#*:}" ;; esac
}

# scram_py — `make` prints a new verifier; `check VERIFIER` exits 0 when it matches. The password
# comes in the environment (PW), never in argv.
scram_py() {
  cat <<'PY'
import base64, hashlib, hmac, os, sys
pw = os.environ['PW'].encode()
def keys(salt, it):
    salted = hashlib.pbkdf2_hmac('sha256', pw, salt, it)
    client = hmac.new(salted, b'Client Key', hashlib.sha256).digest()
    return hashlib.sha256(client).digest(), hmac.new(salted, b'Server Key', hashlib.sha256).digest()
b64 = lambda b: base64.b64encode(b).decode()
if sys.argv[1] == 'make':
    salt, it = os.urandom(16), 4096
    stored, server = keys(salt, it)
    print('SCRAM-SHA-256$%d:%s$%s:%s' % (it, b64(salt), b64(stored), b64(server)))
else:
    try:
        head, tail = sys.argv[2].split('$', 1)[1].split('$')
        it, salt = head.split(':')
        want = tail.split(':')
        stored, server = keys(base64.b64decode(salt), int(it))
        sys.exit(0 if [b64(stored), b64(server)] == want else 1)
    except Exception:
        sys.exit(1)
PY
}

converge_password() {
  local pw stored out
  pw="$(env_db_password)"
  if [ -z "$pw" ]; then
    note "DATABASE_URL has no password yet: put the Infisical value between ':' and '@' in $S_ENV, then re-run"
    return 0
  fi
  if ! [[ "$pw" =~ ^[A-Za-z0-9]{32,}$ ]]; then
    fail "DATABASE_URL's password must be 32+ letters and digits (URL-safe, nothing to encode); left unset"
    return 0
  fi
  scram_py >"$ROOT_TMP/scram.py"
  stored=''
  role_exists "$S_ROLE" && stored="$(pg "select coalesce(rolpassword, '') from pg_authid where rolname = '$S_ROLE'")"
  if [ -n "$stored" ] && PW="$pw" python3 "$ROOT_TMP/scram.py" check "$stored"; then
    ok "role $S_ROLE's stored SCRAM verifier matches the password in $S_ENV"
  else
    act "store role $S_ROLE's SCRAM-SHA-256 verifier for the password in $S_ENV (made here; no plaintext reaches Postgres)" \
      set_role_verifier "$pw"
  fi
  dry && return 0
  # A login that cannot fail on the password (it matches the verifier): it proves pg_hba and TCP.
  if out="$(PGPASSWORD="$pw" PGCONNECT_TIMEOUT=5 psql -X -q -At -h 127.0.0.1 -p "$PG_PORT" \
    -U "$S_ROLE" -d "$S_DB" -c 'select 1' 2>&1)"; then
    ok "$S_ROLE logs in to $S_DB on 127.0.0.1:$PG_PORT"
  else
    fail "$S_ROLE cannot log in over 127.0.0.1:$PG_PORT: $(head -n 1 <<<"$out")"
  fi
}

# The verifier travels on stdin; this session logs no statement.
set_role_verifier() {
  local verifier
  verifier="$(PW="$1" python3 "$ROOT_TMP/scram.py" make)"
  printf "set log_statement = 'none'; set log_min_duration_statement = -1; set log_min_error_statement = panic;
alter role %s password '%s';\n" "$S_ROLE" "$verifier" |
    runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -p "$PG_PORT" -d postgres >/dev/null
}
