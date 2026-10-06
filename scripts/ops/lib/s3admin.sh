# shellcheck shell=bash
# RustFS's admin primitives (D12): the signer, a request as root or as the app's key, the
# comparisons that keep a second run at "changes: 0", and the renderer of @engine/media's policy
# documents (storage.sh). From 8.5's work on Helios (TASKS.md 8.5, unmerged; its findings folded
# in by 3.1): RustFS 1.0.0 answers every call below; it may echo a policy with its Sids dropped,
# a lone string for a one-item list and lists reordered, so policies are compared normalised.
#
# RustFS has no AWS IAM API; it has its own admin API on the S3 port (/rustfs/admin/v3/), signed
# with SigV4 like any S3 call. curl's --aws-sigv4 mis-signs valueless and unsorted query strings
# (7.88, measured), so requests are signed by the small Python below — the standard library only.
# A secret reaches it in its environment, never its arguments: this host's process list is
# readable by every user on it (no hidepid).

S3_LIVE=0
S3_TMP=''

s3_py() {
  cat <<'PY'
import base64, datetime, hashlib, hmac, json, os, re, sys, urllib.error, urllib.parse, urllib.request
from xml.sax.saxutils import escape
def load(path):
    doc = json.load(open(path))
    return doc.get('policy', doc) if isinstance(doc, dict) else doc
LISTS = ('Action', 'NotAction', 'Resource', 'NotResource')
def norm(v, key=None):
    if key == 'Principal' and v == '*':
        v = {'AWS': ['*']}
    if isinstance(v, dict):
        return {k: norm(x, k) for k, x in v.items() if k != 'Sid'}
    if isinstance(v, str) and key is not None and (key in LISTS or ':' in key or key == 'AWS'):
        v = [v]
    if isinstance(v, list):
        return sorted((norm(x) for x in v), key=lambda x: json.dumps(x, sort_keys=True))
    return v
if sys.argv[1] == 'same':
    sys.exit(0 if norm(load(sys.argv[2])) == norm(load(sys.argv[3])) else 1)
if sys.argv[1] == 'empty':
    try:
        doc = load(sys.argv[2])
    except ValueError:
        sys.exit(0)
    sys.exit(0 if not (doc or {}).get('Statement') else 1)
if sys.argv[1] == 'render':
    # render DOCS OUT MEDIA MASTERS ADMIN_ORIGIN SITE_ORIGINS — plan.mjs's documents with its placeholders
    # filled: the media bucket's policy; the app key's one policy, the statements of
    # media-writer and masters-writer together (one key for both buckets, DEPLOYMENT.md §6); and
    # cors.mjs's masters rule (the presigned PUT from the admin origin, the headers it signs).
    docs, out, env = sys.argv[2], sys.argv[3], {'mediaBucket': sys.argv[4], 'mastersBucket': sys.argv[5]}
    def render(v):
        if isinstance(v, str):
            def sub(m):
                if m.group(1) not in env:
                    sys.exit('no value for {{%s}}' % m.group(1))
                return env[m.group(1)]
            return re.sub(r'\{\{([A-Za-z]+)\}\}', sub, v)
        if isinstance(v, list):
            return [render(x) for x in v]
        if isinstance(v, dict):
            return {k: render(x) for k, x in v.items()}
        return v
    read = lambda name: render(json.load(open(os.path.join(docs, name + '.json'))))
    def write(name, doc):
        json.dump(doc, open(os.path.join(out, name), 'w'), sort_keys=True)
    write('bucket-media.json', read('media-public-read'))
    media, masters = read('media-writer'), read('masters-writer')
    write('policy-app.json', {'Version': media['Version'], 'Statement': media['Statement'] + masters['Statement']})
    rule = {'allowedOrigins': [sys.argv[6]], 'allowedMethods': ['PUT'],
            'allowedHeaders': ['content-length', 'content-type', 'x-amz-checksum-sha256'], 'maxAgeSeconds': 3600}
    write('cors-masters.json', {'rules': [rule]})
    # The media bucket: both sites' pages read its public derivatives and zoom tiles from script
    # (the viewer's WebGL canvas needs CORS or it draws black). Read-only; the bucket policy still
    # decides which prefixes an anonymous GET reaches (derivatives/ and iiif/ alone).
    media_rule = {'allowedOrigins': sys.argv[7].split(','), 'allowedMethods': ['GET', 'HEAD'],
                  'maxAgeSeconds': 3600}
    write('cors-media.json', {'rules': [media_rule]})
    sys.exit(0)
TAGS = (('AllowedOrigin', 'allowedOrigins'), ('AllowedMethod', 'allowedMethods'),
        ('AllowedHeader', 'allowedHeaders'), ('ExposeHeader', 'exposeHeaders'))
def rules_of(spec):
    return sorted(({k: sorted(r.get(k, [])) for _, k in TAGS} | {'maxAgeSeconds': r.get('maxAgeSeconds')}
                   for r in spec['rules']), key=lambda r: json.dumps(r, sort_keys=True))
if sys.argv[1] == 'cors-xml':
    out = ['<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">']
    for r in json.load(open(sys.argv[2]))['rules']:
        out.append('<CORSRule>')
        out += ['<%s>%s</%s>' % (t, escape(v), t) for t, k in TAGS for v in r.get(k, [])]
        if r.get('maxAgeSeconds') is not None:
            out.append('<MaxAgeSeconds>%d</MaxAgeSeconds>' % r['maxAgeSeconds'])
        out.append('</CORSRule>')
    open(sys.argv[3], 'w').write(''.join(out + ['</CORSConfiguration>']))
    sys.exit(0)
if sys.argv[1] == 'same-cors':
    import xml.etree.ElementTree as ET
    local = lambda e: e.tag.rsplit('}', 1)[-1]
    have = []
    for rule in (r for r in ET.parse(sys.argv[2]).getroot() if local(r) == 'CORSRule'):
        got = {}
        for c in rule:
            got.setdefault(local(c), []).append((c.text or '').strip())
        r = {k: got.get(t, []) for t, k in TAGS}
        r['maxAgeSeconds'] = int(got['MaxAgeSeconds'][0]) if got.get('MaxAgeSeconds') else None
        have.append(r)
    sys.exit(0 if rules_of({'rules': have}) == rules_of(json.load(open(sys.argv[3]))) else 1)
if sys.argv[1] == 'versioned':
    import xml.etree.ElementTree as ET
    try:
        status = [e.text for e in ET.parse(sys.argv[2]).getroot().iter() if e.tag.rsplit('}', 1)[-1] == 'Status']
    except ET.ParseError:
        status = []
    sys.exit(0 if status == ['Enabled'] else 1)
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
if body and body_path.endswith('.xml'):
    headers['content-type'] = 'application/xml'
    headers['content-md5'] = base64.b64encode(hashlib.md5(body).digest()).decode()
elif body:
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

# py_tool ARGS… — the Python above, for the steps that need no RustFS (rendering, a CORS file).
py_tool() {
  [ -f "$ROOT_TMP/s3.py" ] || s3_py >"$ROOT_TMP/s3.py"
  python3 "$ROOT_TMP/s3.py" "$@"
}

# s3_blind WHAT — RustFS is not answering: a dry run plans the step; an apply run fails it and
# prints no DO for a step it did not take (should-fix 8).
s3_blind() {
  if dry; then
    act "$1" true
  else
    fail "RustFS is not answering on 127.0.0.1:$RUSTFS_PORT: skipped — $1"
  fi
}

# s3_start — ready the signer if RustFS answers; a dry run before RustFS exists plans blind.
s3_start() {
  [ "$S3_LIVE" = 1 ] && return 0
  if [ "$(curl -s -o /dev/null -w '%{http_code}' -m 2 "http://127.0.0.1:$RUSTFS_PORT/health")" != 200 ] ||
    [ ! -r "$RUSTFS_CONF/secret-key" ]; then
    return 0
  fi
  S3_TMP="$ROOT_TMP/s3"
  install -d -m 700 "$S3_TMP"
  s3_py >"$S3_TMP/s3.py"
  S3_LIVE=1
}

# s3 METHOD PATH [BODY_FILE] — as RustFS's root; prints the status, leaves the body in $S3_TMP/out.
s3() {
  S3_AK="$(cat "$RUSTFS_CONF/access-key")" S3_SK="$(cat "$RUSTFS_CONF/secret-key")" \
    python3 "$S3_TMP/s3.py" "$1" "http://127.0.0.1:$RUSTFS_PORT$2" "${3:-}" "$S3_TMP/out"
}
# s3_as ACCESS_KEY SECRET PATH — a GET signed with the app's key; prints the status.
s3_as() {
  S3_AK="$1" S3_SK="$2" python3 "$S3_TMP/s3.py" GET "http://127.0.0.1:$RUSTFS_PORT$3" '' "$S3_TMP/out"
}
# s3_signs ACCESS_KEY SECRET PATH — RustFS took the signature: 2xx, or refused for want of a
# grant (AccessDenied), never for the key or the secret.
s3_signs() {
  local code
  code="$(s3_as "$@")"
  case "$code" in 2??) return 0 ;; 403) grep -q '<Code>AccessDenied</Code>' "$S3_TMP/out" ;; *) return 1 ;; esac
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

s3_set_user() {
  printf '{"secretKey":"%s","status":"enabled"}' "$2" >"$S3_TMP/user.json"
  s3_put "/rustfs/admin/v3/add-user?accessKey=$1" "$S3_TMP/user.json"
  rm -f "$S3_TMP/user.json"
}

# ensure_key ACCESS_KEY POLICY ENV_VAR PROBE_PATH — a key with the secret from shared/.env,
# holding POLICY alone (setting a user's policy replaces what it held). PROBE_PATH is a GET the
# policy grants, so a refusal can only mean the secret.
ensure_key() {
  local key="$1" policy="$2" var="$3" probe="$4" secret='' code
  user_exists_path "$S_ENV" && secret="$(env_get "$S_ENV" "$var")"
  if [ -z "$secret" ]; then
    note "RustFS key $key waits for $var in $S_ENV (40 letters and digits), then a re-run"
    return 0
  fi
  if ! [[ "$secret" =~ ^[A-Za-z0-9]{32,40}$ ]]; then
    fail "$S_ENV: $var must be 32-40 letters and digits (openssl rand -hex 20); key $key left alone"
    return 0
  fi
  if [ "$S3_LIVE" = 0 ]; then
    s3_blind "create RustFS key $key with the secret in $var, holding $policy alone"
    return 0
  fi
  if [ "$(s3 GET "/rustfs/admin/v3/user-info?accessKey=$key")" != 200 ]; then
    act "create RustFS key $key with the secret in $S_ENV's $var" s3_set_user "$key" "$secret"
  elif s3_signs "$key" "$secret" "$probe"; then
    ok "RustFS key $key signs with the secret in $var"
  else
    act "set RustFS key $key's secret to $S_ENV's $var (a request signed with it was refused)" \
      s3_set_user "$key" "$secret"
  fi
  if dry && [ "$(s3 GET "/rustfs/admin/v3/user-info?accessKey=$key")" != 200 ]; then
    act "set $key's policy to $policy alone" true
  elif [ "$(s3 GET "/rustfs/admin/v3/user-info?accessKey=$key")" = 200 ] &&
    grep -q "\"policyName\":\"$policy\"" "$S3_TMP/out"; then
    ok "RustFS key $key holds $policy alone"
  else
    act "set $key's policy to $policy alone (was: $(grep -o '"policyName":"[^"]*"' "$S3_TMP/out" | cut -d'"' -f4))" \
      s3_put "/rustfs/admin/v3/set-user-or-group-policy?policyName=$policy&userOrGroup=$key&isGroup=false"
  fi
  if ! dry; then
    code="$(s3_as "$key" "$secret" "$probe")"
    [ "$code" = 200 ] || fail "RustFS key $key still cannot GET ${probe%%\?*} ($code)"
  fi
}
