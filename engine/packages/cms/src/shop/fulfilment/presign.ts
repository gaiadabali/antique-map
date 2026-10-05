/**
 * A presigned S3 GET — AWS Signature Version 4, query-string form, `UNSIGNED-PAYLOAD` — for one
 * key of a bucket reached path-style (`{endpoint}/{bucket}/{key}`, as MinIO and RustFS need;
 * `@engine/media/storage` `s3ClientConfig`). Written here because `@engine/media/storage` exports
 * a presigned PUT only and `@engine/cms` does not depend on the AWS SDK; the algorithm is the
 * documented one and the unit test holds it to AWS's own worked example. Swap for the SDK's
 * `getSignedUrl(GetObjectCommand)` once `@engine/media` exports a presigned GET.
 */
import { createHash, createHmac } from 'node:crypto'

export type PresignGetInput = {
  /** `http://localhost:9000` — scheme, host and port; no path. */
  readonly endpoint: string
  readonly bucket: string
  readonly key: string
  readonly region: string
  readonly credentials: { readonly accessKeyId: string; readonly secretAccessKey: string }
  readonly expiresInSeconds: number
  readonly now?: Date
}

/** S3's URI encoding: every byte but `A–Z a–z 0–9 - _ . ~` as `%XX`, `/` kept in a path. */
export function s3Encode(value: string, keepSlash = false): string {
  let out = ''
  for (const byte of Buffer.from(value, 'utf8')) {
    const char = String.fromCharCode(byte)
    if (/[A-Za-z0-9\-_.~]/.test(char) || (keepSlash && char === '/')) out += char
    else out += `%${byte.toString(16).toUpperCase().padStart(2, '0')}`
  }
  return out
}

const sha256Hex = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex')
const hmac = (key: Buffer | string, text: string) =>
  createHmac('sha256', key).update(text, 'utf8').digest()

/** `20130524T000000Z` */
const amzDate = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

/**
 * The signed query for a GET of `path` on `host` — the core of the algorithm, exposed so the test
 * can feed it AWS's worked example (a virtual-hosted bucket).
 */
export function signedGetQuery(input: {
  readonly host: string
  readonly path: string
  readonly region: string
  readonly credentials: PresignGetInput['credentials']
  readonly expiresInSeconds: number
  readonly now: Date
}): string {
  const stamp = amzDate(input.now)
  const day = stamp.slice(0, 8)
  const scope = `${day}/${input.region}/s3/aws4_request`
  const params: Array<[string, string]> = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${input.credentials.accessKeyId}/${scope}`],
    ['X-Amz-Date', stamp],
    ['X-Amz-Expires', String(input.expiresInSeconds)],
    ['X-Amz-SignedHeaders', 'host'],
  ]
  const query = params
    .map(([name, value]) => `${s3Encode(name)}=${s3Encode(value)}`)
    .sort()
    .join('&')
  const canonical = ['GET', input.path, query, `host:${input.host}`, '', 'host', 'UNSIGNED-PAYLOAD']
  const toSign = ['AWS4-HMAC-SHA256', stamp, scope, sha256Hex(canonical.join('\n'))].join('\n')
  let key = hmac(`AWS4${input.credentials.secretAccessKey}`, day)
  for (const part of [input.region, 's3', 'aws4_request']) key = hmac(key, part)
  const signature = createHmac('sha256', key).update(toSign, 'utf8').digest('hex')
  return `${query}&X-Amz-Signature=${signature}`
}

/** The URL a browser may GET `key` with for `expiresInSeconds` (S3 allows 1 s to 7 days). */
export function presignGetUrl(input: PresignGetInput): string {
  if (
    !Number.isSafeInteger(input.expiresInSeconds) ||
    input.expiresInSeconds < 1 ||
    input.expiresInSeconds > 604_800
  ) {
    throw new RangeError('a presigned URL lives between 1 second and 7 days')
  }
  const base = new URL(input.endpoint)
  const prefix = base.pathname.replace(/\/+$/, '')
  const path = `${prefix}/${s3Encode(input.bucket)}/${s3Encode(input.key, true)}`
  const query = signedGetQuery({
    host: base.host,
    path,
    region: input.region,
    credentials: input.credentials,
    expiresInSeconds: input.expiresInSeconds,
    now: input.now ?? new Date(),
  })
  return `${base.protocol}//${base.host}${path}?${query}`
}
