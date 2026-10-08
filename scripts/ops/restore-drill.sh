#!/usr/bin/env bash
# The restore drill (TASKS.md 10.3.c; DEPLOYMENT.md §9; SECURITY.md BK3): back up, wipe and restore the staging
# database and the media bucket on Helios, timing each step and proving the result equal to what was backed up.
#
#   bash restore-drill.sh --dry-run     read-only checks and the plan; writes nothing, stops nothing
#   bash restore-drill.sh               the drill: as root on Helios, from a file (scp it first); detaches itself, so an
#                                       ssh drop cannot end it
#   bash restore-drill.sh --foreground  the drill, attached to the terminal (the log is still written)
#
# Everything lands in /var/backups/indies/drill-<UTC stamp>/ (700): drill.log (read it with tail -f), the dump,
# the bucket copy, the before/after row counts, object lists and sample hashes. Staging only. Prints no secret.
# The last line of drill.log is "RESULT: PASS" or "RESULT: FAIL ..."; the exit status says the same.
#
# Order: copy the bucket while the app runs (slow) -> stop the cron jobs and the app -> dump the database and copy
# the objects written meanwhile -> take the "before" evidence -> wipe (the database renamed aside, never dropped;
# the bucket emptied by key, never by a listing) -> restore (pg_restore --create keeps the database's ACL;
# derivatives and tiles get their Cache-Control back, which a copy to disk does not keep) -> the "after" evidence
# and diffs, taken with the app still stopped so nothing writes -> start -> health on both hosts.
#
# First run (2026-10-08): a recursive rm/ls over ~79k objects OOM-killed RustFS at 2 GB (now 6 GB; the wipe is by key);
# pg_restore as postgres cannot read a root-only dump (it reads stdin); the tiles were never put back (now verified).
set -euo pipefail
cd /

MODE=run
for a in "$@"; do
  case "$a" in
    --dry-run) MODE=dry ;;
    --foreground) MODE=fg ;;
    *) echo "usage: $0 [--dry-run | --foreground]" >&2; exit 2 ;;
  esac
done

EXPECT_HOST=server-c # Helios
DB=indies_db
SITE_USER=uindies
BUCKET=rustfs/indies-media
BACKUP_ROOT=/var/backups/indies
NEED_GIB=${DRILL_NEED_GIB:-14} # free space wanted under BACKUP_ROOT: the bucket (7.6 GiB) + the dump + margin
IMMUTABLE='Cache-Control=public, max-age=31536000, immutable'
HOSTS=(indies-gallery.gaiada.com old-east-indies.gaiada.com)
PSQL=(sudo -u postgres psql -v ON_ERROR_STOP=1 -At)
LOCK=/run/lock/indies-restore-drill.lock

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
DIR=$BACKUP_ROOT/drill-$STAMP
ASIDE=indies_db_predrill_${STAMP,,}
FAILS=0

now() { date -u +%s; }
say() { echo "[$(date -u +%H:%M:%S)] $*"; }
mark() { echo "TIME $1 $(now)"; }
bad() { say "CHECK FAILED: $*"; FAILS=$((FAILS + 1)); }
rustfs_up() { [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4032/health || true)" = 200 ]; }
pm2u() { sudo -u "$SITE_USER" bash -lc "pm2 $*"; }
app_status() { pm2u jlist | python3 -c 'import json,sys; print(next((p["pm2_env"]["status"] for p in json.load(sys.stdin) if p["name"]=="uindies"), "absent"))'; }

# ---- the guards: Helios, the staging database, the tools, the room ---------------------------------------------
preflight() {
  [ "$(id -u)" = 0 ] || bad "run as root"
  [ "$(hostname)" = "$EXPECT_HOST" ] || bad "hostname is $(hostname), not $EXPECT_HOST (Helios): refusing"
  [ -d /home/$SITE_USER/current ] && [ -d /var/lib/indies-rustfs/data ] || bad "this host has no staging site"
  for t in mc pg_dump pg_restore psql python3 curl sha256sum crontab sudo; do command -v "$t" >/dev/null || bad "missing tool $t"; done
  [ "$FAILS" = 0 ] || return 0
  [ -r /etc/indies/rustfs/access-key ] && [ -r /etc/indies/rustfs/secret-key ] || bad "RustFS credential files unreadable"
  [ "$("${PSQL[@]}" -d postgres -c "select count(*) from pg_database where datname='$DB'")" = 1 ] || bad "no database $DB"
  [ "$("${PSQL[@]}" -d "$DB" -c "select count(*) from pg_roles where rolname='indies'")" = 1 ] || bad "no role indies"
  [ "$("${PSQL[@]}" -d postgres -c "select count(*) from pg_database where datname='$ASIDE'")" = 0 ] || bad "$ASIDE exists"
  [ "$(app_status)" = online ] || bad "pm2 uindies is not online (is a drill or a release already running?)"
  rustfs_up || bad "RustFS does not answer on 127.0.0.1:4032"
  [ -n "${DRILL_DETACHED:-}" ] || (flock -n 9) 9>"$LOCK" || bad "another restore-drill.sh is running" # not pgrep: $(...) finds itself
  local free
  free=$(df -BG --output=avail "$BACKUP_ROOT" | tail -1 | tr -dc 0-9)
  [ "$free" -ge "$NEED_GIB" ] || bad "only ${free} GiB free under $BACKUP_ROOT, need $NEED_GIB"
  # The nightly dump at 19:40 UTC and a release must not run into the drill.
  local hm
  hm=$(date -u +%H%M)
  { [ "$hm" -lt 1925 ] || [ "$hm" -gt 1955 ]; } || bad "too close to the 19:40 UTC backup timer"
  [ "$(systemctl is-active indies-db-backup.service || true)" != active ] || bad "the nightly backup is running"
  [ -z "$(pgrep -f 'bd.sh|deploy.sh' || true)" ] || bad "a release is running"
  [ "$(stat -c %s /etc/indies/rustfs/secret-key)" -gt 0 ] || bad "empty secret file"
}

plan() {
  cat <<EOF
PLAN (stamp $STAMP; backups in $DIR, mode 700)
  0. guards:      host $EXPECT_HOST, database $DB with role indies, no other drill/release/backup running, >= $NEED_GIB GiB free
  1. bucket copy: mc mirror $BUCKET -> $DIR/indies-media, app still running (slow: ~2-3 min per 8 GiB)
  2. stop:        save $SITE_USER's crontab to $DIR/crontab.uindies, remove it, pm2 stop uindies
  3. back up:     pg_dump -Fc $DB -> $DIR/$DB.dump; mirror the objects written meanwhile
  4. before:      row count of every public table, every object key and size, sha256 + type + Cache-Control of a sample
                  (a derivative .avif and .webp, an iiif info.json and tile, an upload)
  5. wipe:        rename $DB to $ASIDE (never dropped); delete every object by key in batches of 1000 (never a listing
                  during the delete); wait for RustFS if it drops; refuse to go on if any object is left
  6. restore:     pg_restore --create from stdin (keeps owner and ACL); mirror the copy back, derivatives/ and iiif/
                  with the immutable Cache-Control
  7. after:       the same evidence, taken before the app starts; diffs; the database ACL
  8. start:       restore the crontab, pm2 start uindies, /api/health 200 on both hosts (24 tries, 5 s apart)
  9. result:      timings per step, then "RESULT: PASS" only if counts, objects, sample and health all match
  Not done: $ASIDE stays until dropped by hand; no secret is printed; nothing leaves the host.
EOF
}

if [ "$MODE" = dry ]; then
  say "dry run on $(hostname): read-only checks"
  preflight
  say "bucket top level: $(MC_HOST_rustfs="http://$(cat /etc/indies/rustfs/access-key):$(cat /etc/indies/rustfs/secret-key)@127.0.0.1:4032" mc ls rustfs/indies-media/ 2>/dev/null | awk '{print $NF}' | tr '\n' ' ')"
  say "RustFS MemoryMax: $(systemctl show indies-rustfs -p MemoryMax --value); free under $BACKUP_ROOT: $(df -h --output=avail "$BACKUP_ROOT" | tail -1 | tr -d ' ')"
  say "leftover aside databases: $("${PSQL[@]}" -d postgres -c "select string_agg(datname, ' ') from pg_database where datname like '${DB}_predrill_%'")"
  plan
  if [ "$FAILS" = 0 ]; then say "dry run: all checks pass, nothing was changed"; exit 0; fi
  say "dry run: $FAILS check(s) failed"; exit 1
fi

# ---- a real run: detach so an ssh drop cannot end it ------------------------------------------------------------
if [ -z "${DRILL_DETACHED:-}" ]; then # the detached child trusts its parent's preflight
  preflight
  [ "$FAILS" = 0 ] || { echo "preflight failed ($FAILS): run --dry-run to see which" >&2; exit 1; }
fi
if [ "$MODE" = run ] && [ -z "${DRILL_DETACHED:-}" ]; then
  [ -f "$0" ] || { echo "copy the script to a file on the host first (scp), then run it there; a pipe cannot detach" >&2; exit 1; }
  install -d -m 700 "$DIR"
  DRILL_DETACHED=1 DRILL_STAMP=$STAMP setsid nohup bash "$0" --foreground >/dev/null 2>&1 </dev/null &
  echo "drill $STAMP started in the background; follow it with: tail -f $DIR/drill.log"
  exit 0
fi
STAMP=${DRILL_STAMP:-$STAMP}
DIR=$BACKUP_ROOT/drill-$STAMP
ASIDE=indies_db_predrill_${STAMP,,}
install -d -m 700 "$DIR"
trap '' HUP
exec >>"$DIR/drill.log" 2>&1
exec 9>"$LOCK"; flock -n 9 || { say "another drill holds $LOCK: stopping"; exit 1; }

MC_HOST_rustfs="http://$(cat /etc/indies/rustfs/access-key):$(cat /etc/indies/rustfs/secret-key)@127.0.0.1:4032"
export MC_HOST_rustfs

# Exact row counts of every table in public, one "table count" per line.
counts() {
  local t
  for t in $("${PSQL[@]}" -d "$DB" -c "select tablename from pg_tables where schemaname='public' order by 1"); do
    echo "$t $("${PSQL[@]}" -d "$DB" -c "select count(*) from \"$t\"")"
  done
}
# Every object as "key<TAB>size", sorted.
objects() {
  mc ls --recursive --json "$BUCKET" | python3 -c '
import json, sys
for line in sys.stdin:
    o = json.loads(line)
    if o.get("type") == "file":
        print(o["key"] + "\t" + str(o["size"]))' | LC_ALL=C sort
}
# One key matching the pattern from the before list, or nothing.
pick() { grep -m1 -P "$1" "$DIR/objects.before" | cut -f1 || true; }
# The sample's content hash, content type and Cache-Control.
sample() {
  local k
  while read -r k; do
    [ -n "$k" ] || continue
    printf '%s %s %s\n' "$k" "$(mc cat "$BUCKET/$k" | sha256sum | cut -d' ' -f1)" \
      "$(mc stat --json "$BUCKET/$k" | python3 -c 'import json,sys; m=json.load(sys.stdin).get("metadata") or {}; print(m.get("Content-Type"), "|", m.get("Cache-Control"))')"
  done <"$DIR/sample.keys"
}
health() {
  local h code try ok
  for try in $(seq 1 24); do
    ok=1
    for h in "${HOSTS[@]}"; do
      code=$(curl -s -o /dev/null -w '%{http_code}' "https://$h/api/health" || true)
      [ "$code" = 200 ] || ok=0
    done
    if [ "$ok" = 1 ]; then say "health 200 on both hosts (try $try)"; return 0; fi
    sleep 5
  done
  say "HEALTH FAILED"; return 1
}
wait_rustfs() { local i; for i in $(seq 1 60); do rustfs_up && return 0; sleep 5; done; return 1; }
# Delete the keys in a file (one per line, relative to the bucket) in batches; RustFS dropping is waited out.
wipe_keys() {
  local list=$1 n=0 batch attempt
  rm -rf "$DIR/wipe" && install -d -m 700 "$DIR/wipe"
  awk -v p="$BUCKET/" '{print p $0}' "$list" | split -l 1000 - "$DIR/wipe/b."
  for batch in "$DIR"/wipe/b.*; do
    for attempt in 1 2 3 4 5; do
      if mc rm --force --stdin <"$batch" >/dev/null 2>"$DIR/wipe/err"; then break; fi
      # A key already gone is fine on a retry; a dropped RustFS is waited for.
      if grep -q 'Object does not exist' "$DIR/wipe/err" && ! grep -q 'connection refused' "$DIR/wipe/err"; then break; fi
      say "wipe batch ${batch##*.} attempt $attempt failed: $(head -c 200 "$DIR/wipe/err"); waiting for RustFS"
      wait_rustfs || { say "RustFS did not come back"; return 1; }
    done
    n=$((n + 1)); [ $((n % 20)) = 0 ] && say "wiped $((n * 1000)) objects"
  done
  return 0
}
# Copy a mirrored tree back, one top-level prefix at a time; derivatives and tiles get the immutable header.
put_back() {
  local d p attr
  for d in "$DIR"/indies-media/*/; do
    p=$(basename "$d"); attr=()
    case "$p" in derivatives | iiif) attr=(--attr "$IMMUTABLE") ;; esac
    mc mirror --quiet "${attr[@]}" "$d" "$BUCKET/$p" >/dev/null
    say "restored $p"
  done
}

on_exit() {
  local rc=$?
  trap - EXIT ERR
  if [ "$rc" != 0 ] || [ "${PASSED:-0}" != 1 ]; then
    say "Back out: pm2 stop uindies; if $DB exists and is partial, drop it; ALTER DATABASE $ASIDE RENAME TO $DB; put the copy back with mc mirror; crontab -u $SITE_USER $DIR/crontab.uindies; pm2 start uindies."
    say "RESULT: FAIL (exit $rc, last step: ${STEP:-start}). The original database may be renamed to $ASIDE; the bucket copy is in $DIR/indies-media; the app and the cron jobs may still be stopped."
    exit 1
  fi
}
trap on_exit EXIT
trap 'say "error at line $LINENO"' ERR

say "drill $STAMP on $(hostname); disk: $(df -h / | tail -1)"; mark start

STEP=1; say "1. copy the bucket while the app runs"
mc mirror --quiet "$BUCKET" "$DIR/indies-media" >/dev/null
mark bucket_copied

STEP=2; say "2. stop the cron jobs and the app"
crontab -u "$SITE_USER" -l >"$DIR/crontab.uindies"
[ -s "$DIR/crontab.uindies" ] || { say "the crontab copy is empty: stopping"; exit 1; }
crontab -u "$SITE_USER" -r
pm2u 'stop uindies' >/dev/null
mark app_stopped

STEP=3; say "3. dump the database; copy what was written meanwhile"
sudo -u postgres pg_dump -Fc "$DB" >"$DIR/$DB.dump"
chmod 600 "$DIR/$DB.dump"
entries=$(pg_restore --list <"$DIR/$DB.dump" | grep -vc '^;' || true)
say "dump: $(du -h "$DIR/$DB.dump" | cut -f1), $entries entries"
[ "$entries" -gt 100 ] || { say "the dump does not list: stopping before the wipe"; exit 1; }
mc mirror --quiet --overwrite "$BUCKET" "$DIR/indies-media" >/dev/null
mark backed_up

STEP=4; say "4. the before evidence"
counts >"$DIR/counts.before"
objects >"$DIR/objects.before"
{
  pick '^derivatives/.*\.avif\t'
  pick '^derivatives/.*\.webp\t'
  pick '^iiif/.*/info\.json\t'
  pick '^iiif/.*default\.jpg\t'
  pick '^uploads/'
} | grep . >"$DIR/sample.keys" || true
grep -q '^derivatives/' "$DIR/sample.keys" || { say "no derivative in the sample: stopping"; exit 1; }
sample >"$DIR/sample.before"
nobj=$(wc -l <"$DIR/objects.before")
say "before: $(wc -l <"$DIR/counts.before") tables, $(awk '{s+=$2} END {print s}' "$DIR/counts.before") rows; $nobj objects"
[ "$(find "$DIR/indies-media" -type f | wc -l)" = "$nobj" ] || { say "the bucket copy holds a different number of files than the bucket: stopping"; exit 1; }

STEP=5; say "5. wipe"
"${PSQL[@]}" -d postgres -c "select pg_terminate_backend(pid) from pg_stat_activity where datname='$DB' and pid <> pg_backend_pid()" >/dev/null
"${PSQL[@]}" -d postgres -c "alter database $DB rename to $ASIDE"
cut -f1 "$DIR/objects.before" >"$DIR/wipe.keys"
wipe_keys "$DIR/wipe.keys"
left=$(mc ls --recursive "$BUCKET" | wc -l)
say "wiped: database renamed to $ASIDE; bucket objects left: $left"
[ "$left" = 0 ] || { say "the bucket is not empty: stopping"; exit 1; }
mark wiped

STEP=6; say "6. restore"
sudo -u postgres pg_restore --create --exit-on-error -d postgres <"$DIR/$DB.dump"
mark db_restored
put_back
mark bucket_restored

STEP=7; say "7. the after evidence (app still stopped)"
counts >"$DIR/counts.after"
objects >"$DIR/objects.after"
sample >"$DIR/sample.after"
SAME=1
for f in counts objects sample; do
  if diff -q "$DIR/$f.before" "$DIR/$f.after" >/dev/null; then say "$f: identical"; else SAME=0; say "$f: DIFFERENT"; diff "$DIR/$f.before" "$DIR/$f.after" | head -20; fi
done
say "database ACL: $("${PSQL[@]}" -d postgres -c "select coalesce(datacl::text, 'default') from pg_database where datname='$DB'")"
say "owner: $("${PSQL[@]}" -d postgres -c "select pg_get_userbyid(datdba) from pg_database where datname='$DB'")"
mark verified

say "8. start"
pm2u 'start uindies' >/dev/null
crontab -u "$SITE_USER" "$DIR/crontab.uindies"
HEALTHY=1; health || HEALTHY=0
mark up

s=$(awk '/^TIME start /{print $3}' "$DIR/drill.log" | tail -1)
say "TIMINGS (seconds since start):"
awk -v s="$s" '/^TIME /{printf "  %-16s %d\n", $2, $3 - s}' "$DIR/drill.log"
if [ "$SAME" = 1 ] && [ "$HEALTHY" = 1 ]; then
  PASSED=1
  say "RESULT: PASS. $ASIDE stays until dropped by hand."
else
  say "RESULT: FAIL (evidence identical: $SAME, healthy: $HEALTHY)"
  exit 1
fi
