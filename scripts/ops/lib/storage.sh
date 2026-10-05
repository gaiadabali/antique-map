# shellcheck shell=bash
# The storage step (DEPLOYMENT.md §2, §6): the two buckets and the app's one key, from the policy
# documents `pnpm --filter @engine/media storage:policies` applies —
#   engine/packages/media/src/storage/policies/{media-public-read,media-writer,masters-writer}.json
# so the documents are data in one place, and pack.sh inlines them (storage_bundle_packed); from
# a checkout they are read from disk. Bucket policies go first, so a bucket is never public in
# full while its key is being made.
#
#   indies-media      anonymous GetObject under derivatives/ and iiif/ only, the slash included;
#                     no listing, so an upload under uploads/ and the full pyramid under iiif-full/
#                     stay private (8.5: before it, staging's media buckets were public in full)
#   archive-masters   no bucket policy at all (no anonymous request, no listing); versioned, so
#                     no key destroys a master by overwriting it; CORS admits the presigned PUT
#                     from the admin origin alone (cors.mjs's rule)
#   <site user>       the app's one key, holding indies-app alone: media-writer's statements
#                     (read and write the media bucket) and masters-writer's (read every master,
#                     write under masters/, delete nothing) in one policy
#
# A key is created only once its secret is in shared/.env, and set again only when a request
# signed with that secret is refused. The old two-app buckets and keys (ig-media, oei-media,
# uig-*, uoei-*) are not this script's to remove: docs/ops/helios-staging.md, "Retiring".

STORAGE_DIR=''
STORAGE_DOCS=(media-public-read media-writer masters-writer)

app_policy() { printf 'indies-app%s' "$BUCKET_SUFFIX"; }

# storage_bundle — the policy documents in $STORAGE_DIR, rendered for this run's buckets.
storage_bundle() {
  [ -n "$STORAGE_DIR" ] && return 0
  STORAGE_DIR="$ROOT_TMP/storage"
  install -d -m 700 "$STORAGE_DIR" "$STORAGE_DIR/docs"
  if declare -F storage_bundle_packed >/dev/null; then
    storage_bundle_packed "$STORAGE_DIR/docs"
  else
    local d
    for d in "${STORAGE_DOCS[@]}"; do
      cp "$OPS_DIR/../../engine/packages/media/src/storage/policies/$d.json" "$STORAGE_DIR/docs/"
    done
  fi
  py_tool render "$STORAGE_DIR/docs" "$STORAGE_DIR" "$S_MEDIA_BUCKET" "$(masters_bucket)" "https://$S_DOMAIN" ||
    die "the storage policy documents do not render (engine/packages/media/src/storage/policies)"
}

# ensure_bucket NAME private | ensure_bucket NAME public POLICY_FILE
ensure_bucket() {
  local bucket="$1" kind="$2" want="${3:-}" code
  if [ "$S3_LIVE" = 0 ]; then
    s3_blind "create bucket $bucket ($kind)"
    [ "$kind" = private ] || s3_blind "set bucket $bucket's policy: $(tr -d '\n' <"$want")"
    return 0
  fi
  code="$(s3 GET "/$bucket?location")"
  if [ "$code" = 200 ]; then ok "bucket $bucket exists"; else act "create bucket $bucket" s3_put "/$bucket"; fi
  code="$(s3 GET "/$bucket?policy")"
  if [ "$kind" = private ]; then
    if [ "$code" = 200 ] && ! python3 "$S3_TMP/s3.py" empty "$S3_TMP/out"; then
      fail "bucket $bucket has a bucket policy, and it is private: remove it by hand after reading it"
    else
      ok "bucket $bucket is private (no bucket policy)"
    fi
    return 0
  fi
  if [ "$code" = 200 ] && python3 "$S3_TMP/s3.py" same "$S3_TMP/out" "$want"; then
    ok "bucket $bucket: anonymous GetObject under derivatives/ and iiif/ only (no listing)"
  else
    act "set bucket $bucket's policy: anonymous GetObject under derivatives/ and iiif/ only, no listing" \
      s3_put "/$bucket?policy" "$want"
  fi
}

# ensure_versioning BUCKET — versioning enabled (never suspended by this script).
ensure_versioning() {
  local bucket="$1"
  printf '<VersioningConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Status>Enabled</Status></VersioningConfiguration>' \
    >"$STORAGE_DIR/versioning.xml"
  if [ "$S3_LIVE" = 0 ]; then
    s3_blind "enable versioning on bucket $bucket"
    return 0
  fi
  if [ "$(s3 GET "/$bucket?versioning")" = 200 ] && python3 "$S3_TMP/s3.py" versioned "$S3_TMP/out"; then
    ok "bucket $bucket is versioned"
  else
    act "enable versioning on bucket $bucket (an overwrite keeps the old master)" \
      s3_put "/$bucket?versioning" "$STORAGE_DIR/versioning.xml"
  fi
}

# ensure_canned_policy NAME FILE
ensure_canned_policy() {
  local name="$1" file="$2"
  if [ "$S3_LIVE" = 0 ]; then
    s3_blind "create RustFS policy $name: $(tr -d '\n' <"$file")"
    return 0
  fi
  if [ "$(s3 GET "/rustfs/admin/v3/info-canned-policy?name=$name")" = 200 ] &&
    python3 "$S3_TMP/s3.py" same "$S3_TMP/out" "$file"; then
    ok "RustFS policy $name is current"
  else
    act "write RustFS policy $name: $(tr -d '\n' <"$file")" \
      s3_put "/rustfs/admin/v3/add-canned-policy?name=$name" "$file"
  fi
}

# ensure_cors BUCKET SPEC_FILE — the bucket's CORS rules are exactly SPEC_FILE's.
ensure_cors() {
  local bucket="$1" spec="$2" xml="$STORAGE_DIR/cors-$1.xml"
  py_tool cors-xml "$spec" "$xml"
  if [ "$S3_LIVE" = 0 ]; then
    s3_blind "set bucket $bucket's CORS: $(cat "$xml")"
    return 0
  fi
  if [ "$(s3 GET "/$bucket?cors")" = 200 ] && python3 "$S3_TMP/s3.py" same-cors "$S3_TMP/out" "$spec"; then
    ok "bucket $bucket's CORS: https://$S_DOMAIN may PUT a presigned master, no other origin"
  else
    act "set bucket $bucket's CORS: $(cat "$xml")" s3_put "/$bucket?cors" "$xml"
  fi
}

ensure_storage() {
  say "RustFS: buckets $S_MEDIA_BUCKET and $(masters_bucket), policy $(app_policy) ($ENVIRONMENT)"
  s3_start
  [ "$S3_LIVE" = 1 ] || note "RustFS is not answering yet: the bucket and key steps are planned, not compared"
  storage_bundle
  ensure_bucket "$S_MEDIA_BUCKET" public "$STORAGE_DIR/bucket-media.json"
  ensure_bucket "$(masters_bucket)" private
  ensure_versioning "$(masters_bucket)"
  ensure_cors "$(masters_bucket)" "$STORAGE_DIR/cors-masters.json"
  ensure_canned_policy "$(app_policy)" "$STORAGE_DIR/policy-app.json"
}

# ensure_app_key — after shared/.env: the one key, its secret from S3_SECRET_ACCESS_KEY (the same
# as MASTERS_SECRET_ACCESS_KEY, which env_preflight checks).
ensure_app_key() {
  say "RustFS key $S_KEY"
  s3_start
  ensure_key "$S_KEY" "$(app_policy)" S3_SECRET_ACCESS_KEY "/$S_MEDIA_BUCKET?location"
}
