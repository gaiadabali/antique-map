# shellcheck shell=bash
# RustFS's buckets, bucket policies, canned policies and per-site keys (D12; DEPLOYMENT.md §2):
#   ig-media, oei-media  public read of objects (never a listing), for MEDIA_PUBLIC_URL
#   archive-masters      private: no bucket policy at all
#   <user>-media         read and write its own brand's media bucket, nothing else
#   uig-masters          read and write the masters bucket
#   uoei-masters         read the masters, write only under print-files/
# A key is created only once its secret is in the site's shared/.env (from Infisical), and set
# again only when a signed request with that secret is refused. Policy changes are compared as
# JSON, so a second run changes nothing.
#
# RustFS has no AWS IAM API; it has its own admin API on the S3 port (/rustfs/admin/v3/), signed
# with SigV4 like any S3 call. curl's --aws-sigv4 mis-signs valueless and unsorted query strings
# (7.88, measured), so requests are signed by the small Python below — the standard library only.

S3_LIVE=0
S3_TMP=''

s3_py() {
  cat <<'PY'
import datetime, hashlib, hmac, json, os, sys, urllib.error, urllib.parse, urllib.request
if sys.argv[1] == 'same':
    def load(path):
        doc = json.load(open(path))
        return doc.get('policy', doc) if isinstance(doc, dict) else doc
    sys.exit(0 if load(sys.argv[2]) == load(sys.argv[3]) else 1)
method, url, body_path, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
body = open(body_path, 'rb').read() if body_path else b''
ak, sk, region = os.environ['S3_AK'], os.environ['S3_SK'], 'us-east-1'
u = urllib.parse.urlsplit(url)
now = datetime.datetime.now(datetime.timezone.utc)
amz, day = now.strftime('%Y%m%dT%H%M%SZ'), now.strftime('%Y%m%d')
payload = hashlib.sha256(body).hexdigest()
q = sorted(urllib.parse.parse_qsl(u.query, keep_blank_values=True))
cq = '&'.join(urllib.parse.quote(k, safe='-_.~') + '=' + urllib.parse.quote(v, safe='-_.~') for k, v in q)
path = urllib.parse.quote(urllib.parse.unquote(u.path) or '/', safe='/-_.~')
headers = {'host': u.netloc, 'x-amz-content-sha256': payload, 'x-amz-date': amz}
if body:
    headers['content-type'] = 'application/json'
signed = ';'.join(sorted(headers))
canonical = '\n'.join([method, path, cq, ''.join(k + ':' + headers[k] + '\n' for k in sorted(headers)), signed, payload])
scope = day + '/' + region + '/s3/aws4_request'
to_sign = '\n'.join(['AWS4-HMAC-SHA256', amz, scope, hashlib.sha256(canonical.encode()).hexdigest()])
key = ('AWS4' + sk).encode()
for part in (day, region, 's3', 'aws4_request'):
    key = hmac.new(key, part.encode(), hashlib.sha256).digest()
headers['authorization'] = 'AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s' % (
    ak, scope, signed, hmac.new(key, to_sign.encode(), hashlib.sha256).hexdigest())
request = urllib.request.Request(u.scheme + '://' + u.netloc + path + ('?' + cq if cq else ''),
                                 data=body or None, method=method, headers=headers)
try:
    with urllib.request.urlopen(request, timeout=30) as r:
        code, data = r.status, r.read()
except urllib.error.HTTPError as e:
    code, data = e.code, e.read()
open(out, 'wb').write(data)
print(code)
PY
}

s3_cleanup() { [ -z "$S3_TMP" ] || rm -rf "$S3_TMP"; }

# s3_start — ready the signer if RustFS answers; a dry run before RustFS exists plans blind.
s3_start() {
  [ "$S3_LIVE" = 1 ] && return 0
  if [ "$(curl -s -o /dev/null -w '%{http_code}' -m 2 "http://127.0.0.1:$RUSTFS_PORT/health")" != 200 ] ||
    [ ! -r "$RUSTFS_CONF/secret-key" ]; then
    return 0
  fi
  S3_TMP="$(mktemp -d)"
  chmod 700 "$S3_TMP"
  trap s3_cleanup EXIT
  s3_py >"$S3_TMP/s3.py"
  S3_LIVE=1
}

# s3 METHOD PATH [BODY_FILE] — as RustFS's root; prints the status, leaves the body in $S3_TMP/out.
s3() {
  S3_AK="$(cat "$RUSTFS_CONF/access-key")" S3_SK="$(cat "$RUSTFS_CONF/secret-key")" \
    python3 "$S3_TMP/s3.py" "$1" "http://127.0.0.1:$RUSTFS_PORT$2" "${3:-}" "$S3_TMP/out"
}
s3_as() {
  S3_AK="$1" S3_SK="$2" python3 "$S3_TMP/s3.py" GET "http://127.0.0.1:$RUSTFS_PORT/$3?location" '' "$S3_TMP/out"
}

# s3_put PATH [BODY_FILE] — a change that must succeed: anything but 2xx stops the run.
s3_put() {
  local code
  code="$(s3 PUT "$1" "${2:-}")"
  case "$code" in
    2??) ;;
    *)
      echo "RustFS PUT ${1%%\?*} answered $code: $(head -c 300 "$S3_TMP/out")" >&2
      return 1
      ;;
  esac
}

policy_rw() {
  printf '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:GetBucketLocation","s3:ListBucket","s3:ListBucketMultipartUploads"],"Resource":["arn:aws:s3:::%s"]},{"Effect":"Allow","Action":["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:AbortMultipartUpload","s3:ListMultipartUploadParts"],"Resource":["arn:aws:s3:::%s/*"]}]}' "$1" "$1"
}
policy_read_write_prefix() {
  printf '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:GetBucketLocation","s3:ListBucket","s3:ListBucketMultipartUploads"],"Resource":["arn:aws:s3:::%s"]},{"Effect":"Allow","Action":["s3:GetObject"],"Resource":["arn:aws:s3:::%s/*"]},{"Effect":"Allow","Action":["s3:PutObject","s3:DeleteObject","s3:AbortMultipartUpload","s3:ListMultipartUploadParts"],"Resource":["arn:aws:s3:::%s/%s/*"]}]}' "$1" "$1" "$1" "$2"
}
policy_public_read() {
  printf '{"Version":"2012-10-17","Statement":[{"Sid":"PublicReadObjects","Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetObject"],"Resource":["arn:aws:s3:::%s/*"]}]}' "$1"
}

# ensure_bucket NAME public|private
ensure_bucket() {
  local bucket="$1" kind="$2" code
  if [ "$S3_LIVE" = 0 ]; then
    act "create bucket $bucket ($kind)" true
    return 0
  fi
  code="$(s3 GET "/$bucket?location")"
  if [ "$code" = 200 ]; then ok "bucket $bucket exists"; else act "create bucket $bucket" s3_put "/$bucket"; fi
  code="$(s3 GET "/$bucket?policy")"
  if [ "$kind" = private ]; then
    if [ "$code" = 200 ]; then
      fail "bucket $bucket has a bucket policy, and the masters are private: remove it by hand after reading it"
    else
      ok "bucket $bucket is private (no bucket policy)"
    fi
    return 0
  fi
  policy_public_read "$bucket" >"$S3_TMP/want.json"
  if [ "$code" = 200 ] && python3 "$S3_TMP/s3.py" same "$S3_TMP/out" "$S3_TMP/want.json"; then
    ok "bucket $bucket: anonymous GetObject only (no listing)"
  else
    cp "$S3_TMP/want.json" "$S3_TMP/public-$bucket.json"
    act "set bucket $bucket's policy: anonymous GetObject on its objects, no listing" \
      s3_put "/$bucket?policy" "$S3_TMP/public-$bucket.json"
  fi
}

# ensure_canned_policy NAME JSON
ensure_canned_policy() {
  local name="$1"
  if [ "$S3_LIVE" = 0 ]; then
    act "create RustFS policy $name: $2" true
    return 0
  fi
  printf '%s' "$2" >"$S3_TMP/policy-$name.json"
  if [ "$(s3 GET "/rustfs/admin/v3/info-canned-policy?name=$name")" = 200 ] &&
    python3 "$S3_TMP/s3.py" same "$S3_TMP/out" "$S3_TMP/policy-$name.json"; then
    ok "RustFS policy $name is current"
  else
    act "write RustFS policy $name: $2" s3_put "/rustfs/admin/v3/add-canned-policy?name=$name" "$S3_TMP/policy-$name.json"
  fi
}

s3_set_user() {
  printf '{"secretKey":"%s","status":"enabled"}' "$2" >"$S3_TMP/user.json"
  s3_put "/rustfs/admin/v3/add-user?accessKey=$1" "$S3_TMP/user.json"
  rm -f "$S3_TMP/user.json"
}

# ensure_key ACCESS_KEY POLICY ENV_VAR BUCKET — the site's key, with the secret from shared/.env.
ensure_key() {
  local key="$1" policy="$2" var="$3" bucket="$4" secret='' code
  [ -f "$S_ENV" ] && secret="$(env_get "$S_ENV" "$var")"
  if [ -z "$secret" ]; then
    note "RustFS key $key waits for $var in $S_ENV (40 letters and digits from Infisical), then a re-run"
    return 0
  fi
  if ! [[ "$secret" =~ ^[A-Za-z0-9]{32,40}$ ]]; then
    fail "$S_ENV: $var must be 32-40 letters and digits (openssl rand -hex 20); key $key left alone"
    return 0
  fi
  if [ "$S3_LIVE" = 0 ]; then
    act "create RustFS key $key with the secret in $var, attached to $policy" true
    return 0
  fi
  if [ "$(s3 GET "/rustfs/admin/v3/user-info?accessKey=$key")" != 200 ]; then
    act "create RustFS key $key with the secret in $S_ENV's $var" s3_set_user "$key" "$secret"
  elif [ "$(s3_as "$key" "$secret" "$bucket")" = 200 ]; then
    ok "RustFS key $key signs with the secret in $var"
  else
    act "set RustFS key $key's secret to $S_ENV's $var (a signed request with it was refused)" \
      s3_set_user "$key" "$secret"
  fi
  if dry && [ "$(s3 GET "/rustfs/admin/v3/user-info?accessKey=$key")" != 200 ]; then
    act "attach policy $policy to $key" true
  elif [ "$(s3 GET "/rustfs/admin/v3/user-info?accessKey=$key")" = 200 ] &&
    grep -q "\"policyName\":\"$policy\"" "$S3_TMP/out"; then
    ok "RustFS key $key has policy $policy"
  else
    act "attach policy $policy to $key" \
      s3_put "/rustfs/admin/v3/set-user-or-group-policy?policyName=$policy&userOrGroup=$key&isGroup=false"
  fi
  if ! dry; then
    code="$(s3_as "$key" "$secret" "$bucket")"
    [ "$code" = 200 ] || fail "RustFS key $key still cannot read $bucket's location ($code)"
  fi
}

ensure_storage_shared() {
  say "RustFS buckets ($ENVIRONMENT)"
  s3_start
  [ "$S3_LIVE" = 1 ] || note "RustFS is not answering yet: the bucket and key steps are planned, not compared"
  ensure_bucket "$(masters_bucket)" private
}

ensure_storage_site() {
  say "$S_APP: RustFS bucket $S_MEDIA_BUCKET and keys $S_MEDIA_KEY, $S_MASTERS_KEY"
  s3_start
  ensure_bucket "$S_MEDIA_BUCKET" public
  ensure_canned_policy "indies-$S_MEDIA_KEY" "$(policy_rw "$S_MEDIA_BUCKET")"
  if [ "$S_APP" = gallery ]; then
    ensure_canned_policy "indies-$S_MASTERS_KEY" "$(policy_rw "$(masters_bucket)")"
  else
    ensure_canned_policy "indies-$S_MASTERS_KEY" "$(policy_read_write_prefix "$(masters_bucket)" print-files)"
  fi
  ensure_key "$S_MEDIA_KEY" "indies-$S_MEDIA_KEY" S3_SECRET_ACCESS_KEY "$S_MEDIA_BUCKET"
  ensure_key "$S_MASTERS_KEY" "indies-$S_MASTERS_KEY" MASTERS_SECRET_ACCESS_KEY "$(masters_bucket)"
}
