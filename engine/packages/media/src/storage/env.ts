/**
 * Which bucket a process writes, read from its environment (DEPLOYMENT.md §2, §8) — never from
 * code: the one public media bucket (`S3_*`) and the one private masters bucket (`MASTERS_*`),
 * both on the one S3-compatible endpoint (`S3_ENDPOINT`: MinIO locally, RustFS on staging, D12).
 * Each has its own key pair, so the media key reaches the media bucket only and the masters key
 * the masters bucket only (`policies/`).
 *
 * Read at request time, never while the Payload config is built: what is configured changes how a
 * file is stored, never the schema.
 */
type Env = Readonly<Record<string, string | undefined>>

export type S3Target = {
  readonly endpoint: string
  readonly region: string
  readonly bucket: string
  /** Absent: the SDK's default chain (an instance role). Locally and on Helios, always present. */
  readonly credentials?: { readonly accessKeyId: string; readonly secretAccessKey: string }
}

function trimmed(env: Env, name: string): string | undefined {
  return env[name]?.trim() || undefined
}

function target(env: Env, bucketVar: string, keyVar: string, secretVar: string): S3Target | null {
  const endpoint = trimmed(env, 'S3_ENDPOINT')
  const bucket = trimmed(env, bucketVar)
  if (!endpoint || !bucket) return null
  const accessKeyId = trimmed(env, keyVar)
  const secretAccessKey = trimmed(env, secretVar)
  return {
    endpoint,
    // R2 takes "auto"; MinIO and RustFS, with no region of their own configured, accept any.
    region: trimmed(env, 'S3_REGION') ?? 'auto',
    bucket,
    ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
  }
}

/** The public media bucket, or null while no bucket and endpoint are configured. */
export function mediaStorageTarget(env: Env): S3Target | null {
  return target(env, 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY')
}

/** The private masters bucket, or null while it is not configured. */
export function mastersStorageTarget(env: Env): S3Target | null {
  return target(env, 'MASTERS_BUCKET', 'MASTERS_ACCESS_KEY_ID', 'MASTERS_SECRET_ACCESS_KEY')
}

/**
 * The client options both buckets are reached with. Path-style addressing — the bucket in the
 * path, not the host name — because MinIO and RustFS need it and R2 accepts it.
 */
export function s3ClientConfig(target: S3Target) {
  return {
    endpoint: target.endpoint,
    region: target.region,
    forcePathStyle: true,
    // The SDK default has no timeouts: a stalled socket would hold a request (and its memory) forever.
    requestHandler: {
      connectionTimeout: 5_000,
      requestTimeout: 120_000,
      throwOnRequestTimeout: true,
    },
    ...(target.credentials ? { credentials: { ...target.credentials } } : {}),
  }
}
