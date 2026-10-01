// Bucket and key policies as data (TASKS.md 8.3.c; DEPLOYMENT.md §2). Pure: what `./apply.mjs`
// runs, built from a plan file and the policy documents beside this file, with nothing executed.
//
// The documents:
//   media-public-read.json  each media bucket's bucket policy: anonymous GET of derivatives/ and
//                           iiif/ — the derivative ladder and the capped tiles — and nothing else,
//                           so an upload's full-resolution original is never served (8.3.g)
//   media-writer.json       a brand's media key: reads and writes its own media bucket only
//   masters-origin.json     the origin brand's masters key: reads every master, writes captures and
//                           its own print files (print-files/<brand>/), and deletes nothing
//   masters-outlet.json     the outlet brand's masters key: reads captures and print files, and
//                           writes only its own print files, under print-files/<brand>/ (C9
//                           printFileKey())
// The masters bucket gets no anonymous access at all: a master has no public URL — and a CORS
// rule admitting each brand's admin origin for the presigned PUT alone (./cors.mjs). No web key may
// delete a capture: the archive is irreplaceable, and the one deletion it needs — an intake copy
// once filed and verified (TASKS.md 15.4) — is a job's, with a key of its own when 15.4 asks.
//
// Placeholders are `{{mediaBucket}}`, `{{mastersBucket}}` and `{{brand}}` (a masters key's brand
// slug) — never `${…}`, which IAM itself reads as a policy variable.
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { CORS_NOT_IMPLEMENTED, corsOperation, corsProblems } from './cors.mjs'

const here = dirname(fileURLToPath(import.meta.url))

/** Each key policy a plan's user may hold, and the placeholders its document needs. */
export const KEY_POLICIES = {
  'media-writer': ['mediaBucket'],
  'masters-origin': ['mastersBucket', 'brand'],
  'masters-outlet': ['mastersBucket', 'brand'],
}
export const BUCKET_POLICY = 'media-public-read'

const BUCKET_NAME = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/
// MinIO's access keys are 3–20 characters here; a user's name is its access key.
const USER_NAME = /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/
const PLACEHOLDER = /\{\{([A-Za-z]+)\}\}/g
const BRAND_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** A policy document from this folder, parsed. */
export function loadDocument(name) {
  return JSON.parse(readFileSync(join(here, `${name}.json`), 'utf8'))
}

/** `document` with every `{{name}}` replaced from `vars`; throws on a placeholder `vars` lacks. */
export function renderPolicy(document, vars) {
  const render = (value) => {
    if (typeof value === 'string') {
      return value.replace(PLACEHOLDER, (_, key) => {
        if (typeof vars[key] !== 'string') throw new Error(`no value for {{${key}}}`)
        return vars[key]
      })
    }
    if (Array.isArray(value)) return value.map(render)
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, render(inner)]))
    }
    return value
  }
  return render(document)
}

/** Every problem with a plan, in words; an empty list when it can be applied. */
export function planProblems(plan) {
  const problems = []
  if (!plan || typeof plan !== 'object') return ['a plan is a JSON object']
  if (!BUCKET_NAME.test(plan.mastersBucket ?? '')) problems.push('mastersBucket: a bucket name')
  const buckets = Array.isArray(plan.mediaBuckets) ? plan.mediaBuckets : []
  if (buckets.length === 0) problems.push('mediaBuckets: at least one bucket')
  for (const bucket of buckets) {
    if (!BUCKET_NAME.test(bucket)) problems.push(`mediaBuckets: "${bucket}" is not a bucket name`)
    if (bucket === plan.mastersBucket) problems.push(`"${bucket}" cannot be public and private`)
  }
  const seen = new Set()
  for (const [i, entry] of (Array.isArray(plan.users) ? plan.users : []).entries()) {
    const at = `users[${i}]`
    if (!USER_NAME.test(entry?.user ?? '')) problems.push(`${at}.user: 3–20 of a-z, 0-9 and -`)
    if (seen.has(entry?.user)) problems.push(`${at}.user: "${entry.user}" twice`)
    seen.add(entry?.user)
    if (!Object.hasOwn(KEY_POLICIES, entry?.policy ?? '')) {
      problems.push(`${at}.policy: one of ${Object.keys(KEY_POLICIES).join(', ')}`)
    } else if (entry.policy === 'media-writer' && !buckets.includes(entry.bucket)) {
      problems.push(`${at}.bucket: a media-writer names one of mediaBuckets`)
    } else if (entry.policy !== 'media-writer' && entry.bucket !== undefined) {
      problems.push(`${at}.bucket: only a media-writer names a bucket`)
    } else if (entry.policy !== 'media-writer' && !BRAND_SLUG.test(entry.brand ?? '')) {
      problems.push(`${at}.brand: a masters key names its brand's slug`)
    } else if (entry.policy === 'media-writer' && entry.brand !== undefined) {
      problems.push(`${at}.brand: a media-writer is scoped by its bucket, not a brand`)
    }
  }
  problems.push(...corsProblems(plan.mastersCors))
  return problems
}

/** The name a user's policy is created under: one per media bucket, or per brand for masters. */
export function policyName(entry) {
  return entry.policy === 'media-writer'
    ? `media-writer-${entry.bucket}`
    : `${entry.policy}-${entry.brand}`
}

/**
 * A workstation's secret for `user`, derived from MinIO's root secret, so every worktree computes
 * the same one and none is ever written down or printed. Local only: `./apply.mjs` refuses it for
 * anything but the dev container; a host's secrets come from its own environment (Infisical).
 */
export function deriveLocalSecret(rootSecret, user) {
  if (!rootSecret) throw new Error('deriving a local secret needs the root secret')
  // Hex, never base64url: a secret that begins with "-" reads to mc as a flag.
  return createHmac('sha256', rootSecret)
    .update(`indies-local-storage:${user}`)
    .digest('hex')
    .slice(0, 40)
}

/** The environment variable a host's secret for `user` is read from. */
export function secretVariable(user) {
  return `STORAGE_SECRET_${user.toUpperCase().replaceAll('-', '_')}`
}

/**
 * The operations a plan applies, in order: bucket policies first, so a bucket is never public in
 * full while its users are being made, and the masters bucket's CORS; then each key policy once;
 * then each user and its policy.
 * `secretFor(user)` supplies each user's secret.
 */
export function planOperations(plan, { secretFor, read = loadDocument }) {
  const problems = planProblems(plan)
  if (problems.length > 0) throw new Error(`the plan is not valid:\n  ${problems.join('\n  ')}`)
  const operations = plan.mediaBuckets.map((bucket) => ({
    kind: 'bucket-policy',
    bucket,
    document: renderPolicy(read(BUCKET_POLICY), { mediaBucket: bucket }),
  }))
  operations.push({ kind: 'bucket-private', bucket: plan.mastersBucket })
  operations.push(corsOperation(plan))
  const created = new Set()
  for (const entry of plan.users) {
    const name = policyName(entry)
    if (created.has(name)) continue
    created.add(name)
    const vars = {
      mediaBucket: entry.bucket,
      mastersBucket: plan.mastersBucket,
      brand: entry.brand,
    }
    operations.push({ kind: 'key-policy', name, document: renderPolicy(read(entry.policy), vars) })
  }
  for (const entry of plan.users) {
    operations.push({ kind: 'user', user: entry.user, secret: secretFor(entry.user) })
    operations.push({ kind: 'attach', user: entry.user, policy: policyName(entry) })
  }
  return operations
}

/** Where an `mc` command's policy document goes: the runner writes it to a file, then passes it. */
export const POLICY_FILE = '<policy-file>'

/** An operation as words, for a dry run and the log — never with a secret. */
export function describe(operation) {
  switch (operation.kind) {
    case 'bucket-policy':
      return `bucket ${operation.bucket}: anonymous read of derivatives/ and iiif/ only`
    case 'bucket-private':
      return `bucket ${operation.bucket}: no anonymous access`
    case 'bucket-cors':
      return `bucket ${operation.bucket}: CORS admits a signed PUT from ${operation.origins.join(', ')} only`
    case 'key-policy':
      return `policy ${operation.name}`
    case 'user':
      return `user ${operation.user} (secret not shown)`
    case 'attach':
      return `user ${operation.user} ← policy ${operation.policy}`
  }
  throw new Error(`unknown operation ${operation.kind}`)
}

/**
 * The `mc` arguments of an operation against `target` (an mc alias), with `POLICY_FILE` standing
 * for the file `document` is written to. An `attach` already in place is no error (`alreadyDone`).
 */
export function mcCommand(operation, target) {
  switch (operation.kind) {
    case 'bucket-policy':
      return {
        args: ['anonymous', 'set-json', POLICY_FILE, `${target}/${operation.bucket}`],
        document: JSON.stringify(operation.document),
      }
    case 'bucket-private':
      return { args: ['anonymous', 'set', 'none', `${target}/${operation.bucket}`] }
    case 'bucket-cors':
      // Replaces the bucket's whole CORS configuration: applying it again changes nothing.
      return {
        args: ['cors', 'set', `${target}/${operation.bucket}`, POLICY_FILE],
        document: operation.document,
        notImplemented: CORS_NOT_IMPLEMENTED,
      }
    case 'key-policy':
      return {
        args: ['admin', 'policy', 'create', target, operation.name, POLICY_FILE],
        document: JSON.stringify(operation.document),
      }
    case 'user':
      return {
        args: ['admin', 'user', 'add', target, operation.user, operation.secret],
        secret: operation.secret,
      }
    case 'attach':
      return {
        args: ['admin', 'policy', 'attach', target, operation.policy, '--user', operation.user],
        alreadyDone: /already (been )?(applied|attached)/i,
      }
  }
  throw new Error(`unknown operation ${operation.kind}`)
}

/**
 * The policies a user holds beyond the one the plan gives it, from `mc admin user info --json`:
 * an attach adds and never replaces, so a policy narrowed or renamed in the plan would otherwise
 * stay attached beside its successor, with its old grants.
 */
export function stalePolicies(userInfoJson, planned) {
  const held = String(JSON.parse(userInfoJson).policyName ?? '')
  return held
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name && name !== planned)
}

/** The `mc` arguments that read a user's policies, and that detach one of them. */
export function mcUserPolicyCommands(target, user) {
  return {
    info: ['admin', 'user', 'info', target, user, '--json'],
    detach: (policy) => ['admin', 'policy', 'detach', target, policy, '--user', user],
  }
}
