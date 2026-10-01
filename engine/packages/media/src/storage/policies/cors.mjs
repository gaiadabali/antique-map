// The masters bucket's CORS as data (TASKS.md 8.3.i; DEPLOYMENT.md §2). Pure, like ./plan.mjs.
//
// A master goes from the admin's browser straight into the masters bucket by a presigned PUT
// (`../masters-store.ts` presignPut), so the bucket admits each brand's admin origin — its
// SITE_URL — for that PUT and the headers it signs, and no other origin, method or header. A
// plan names the origins:
//
//   "mastersCors": { "adminOrigins": ["https://<brand host>", …], "ifUnsupported": "fail" }
//
// An origin is `https://<host>[:port]`, or — a workstation's — `http://localhost` or
// `http://127.0.0.1` with a port or `*` for any port: a worktree's port is allocated per phase and
// lane (engine/tooling/worktree), so the local plan cannot list them. A wildcard anywhere else, a
// path, or plain http to any other host is refused.
//
// `ifUnsupported` says what `./apply.mjs` does when the storage answers that it implements no
// per-bucket CORS — MinIO's community edition answers PutBucketCors with NotImplemented and
// serves CORS from its server-wide `api cors_allow_origin` alone (default `*`, every origin):
// `fail` (the default, and every host's) stops the run; `warn` (the local plan's, honoured only
// for the dev container) says so and goes on.

/** The one method a browser sends the masters bucket: the presigned PUT. */
export const MASTERS_CORS_METHODS = ['PUT']
/** The headers presignPut() signs and the browser sends: its length, its type, its SHA-256. */
export const MASTERS_CORS_HEADERS = ['content-length', 'content-type', 'x-amz-checksum-sha256']
/** How long a browser may reuse a preflight's answer. */
export const MASTERS_CORS_MAX_AGE_SECONDS = 3600
export const CORS_UNSUPPORTED = ['fail', 'warn']
/** mc's words, and the S3 error, when a storage has no per-bucket CORS. */
export const CORS_NOT_IMPLEMENTED = /not ?implemented/i

const LABEL = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?'
const PORT = '(?:6553[0-5]|655[0-2]\\d|65[0-4]\\d{2}|6[0-4]\\d{3}|[1-5]\\d{4}|[1-9]\\d{0,3})'
const SECURE_ORIGIN = new RegExp(`^https://${LABEL}(?:\\.${LABEL})+(?::${PORT})?$`)
const LOOPBACK_ORIGIN = new RegExp(`^http://(?:localhost|127\\.0\\.0\\.1)(?::(?:${PORT}|\\*))?$`)

/** Whether an origin may be admitted: a host's over HTTPS, or a workstation's loopback one. */
export function isAdmissibleOrigin(origin) {
  return typeof origin === 'string' && (SECURE_ORIGIN.test(origin) || LOOPBACK_ORIGIN.test(origin))
}

/** Every problem with a plan's `mastersCors`, in words; an empty list when it can be applied. */
export function corsProblems(cors) {
  if (!cors || typeof cors !== 'object') {
    return ["mastersCors: the admin origins the masters bucket's CORS admits"]
  }
  const problems = []
  const origins = Array.isArray(cors.adminOrigins) ? cors.adminOrigins : []
  if (origins.length === 0) problems.push('mastersCors.adminOrigins: at least one origin')
  const seen = new Set()
  for (const origin of origins) {
    if (!isAdmissibleOrigin(origin)) {
      problems.push(
        `mastersCors.adminOrigins: "${origin}" is not https://<host>[:port] or a loopback origin`,
      )
    }
    if (seen.has(origin)) problems.push(`mastersCors.adminOrigins: "${origin}" twice`)
    seen.add(origin)
  }
  if (cors.ifUnsupported !== undefined && !CORS_UNSUPPORTED.includes(cors.ifUnsupported)) {
    problems.push(`mastersCors.ifUnsupported: one of ${CORS_UNSUPPORTED.join(', ')}`)
  }
  return problems
}

/** The bucket's CORS rules, in the S3 API's shape (PutBucketCors `CORSRules`). */
export function mastersCorsRules(cors) {
  return [
    {
      AllowedOrigins: [...cors.adminOrigins],
      AllowedMethods: [...MASTERS_CORS_METHODS],
      AllowedHeaders: [...MASTERS_CORS_HEADERS],
      MaxAgeSeconds: MASTERS_CORS_MAX_AGE_SECONDS,
    },
  ]
}

const escapeXml = (text) => String(text).replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`)

/** The rules as the CORSConfiguration document `mc cors set` reads. */
export function corsXml(rules) {
  const element = (name, values) => values.map((v) => `<${name}>${escapeXml(v)}</${name}>`).join('')
  const body = rules
    .map(
      (rule) =>
        `<CORSRule>${element('AllowedOrigin', rule.AllowedOrigins)}${element('AllowedMethod', rule.AllowedMethods)}${element('AllowedHeader', rule.AllowedHeaders)}<MaxAgeSeconds>${rule.MaxAgeSeconds}</MaxAgeSeconds></CORSRule>`,
    )
    .join('')
  return `<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">${body}</CORSConfiguration>`
}

/** The operation that sets the masters bucket's CORS — whole, so applying it again changes nothing. */
export function corsOperation(plan) {
  const rules = mastersCorsRules(plan.mastersCors)
  return {
    kind: 'bucket-cors',
    bucket: plan.mastersBucket,
    origins: rules[0].AllowedOrigins,
    document: corsXml(rules),
    ifUnsupported: plan.mastersCors.ifUnsupported ?? 'fail',
  }
}
