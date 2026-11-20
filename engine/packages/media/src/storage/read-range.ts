/**
 * Reads a byte range of a `media` upload, wherever the process stores uploads: the media bucket
 * (`S3_*`, under `UPLOADS_PREFIX`), or — no bucket configured, as on a workstation without MinIO
 * and in the tests — the collection's folder on disk. For the one route that serves a published
 * video or PDF to the public (`@engine/http/media`); nothing else reads an upload's bytes this way.
 *
 * The body is streamed, never buffered: a video is up to `MEDIA_UPLOAD_MAX_BYTES`, and a player
 * asks for it a range at a time. A missing object is `null`, never an error.
 */
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { Readable } from 'node:stream'

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'

import { s3ClientConfig, type S3Target } from './env'

/** Inclusive byte offsets, as HTTP ranges count them. */
export type ByteRange = { readonly start: number; readonly end: number }

export type UploadRange = { readonly body: ReadableStream<Uint8Array>; readonly length: number }

/** Where uploads live: the media bucket, or a folder on disk. */
export type UploadSource = { readonly target: S3Target } | { readonly dir: string }

let cached: { readonly signature: string; readonly client: S3Client } | null = null

function clientFor(target: S3Target): S3Client {
  const signature = JSON.stringify(target)
  if (cached?.signature !== signature) {
    cached = { signature, client: new S3Client(s3ClientConfig(target)) }
  }
  return cached.client
}

const isMissing = (error: unknown) => {
  const { name, $metadata, code } = (error ?? {}) as {
    name?: string
    code?: string
    $metadata?: { httpStatusCode?: number }
  }
  return (
    name === 'NotFound' ||
    name === 'NoSuchKey' ||
    code === 'ENOENT' ||
    $metadata?.httpStatusCode === 404
  )
}

/**
 * `range` of the upload stored as `prefix/filename` (the bucket) or `filename` in `dir` (the
 * disk). A file name that would leave the folder is refused as missing.
 */
export async function readUploadRange(
  source: UploadSource,
  prefix: string,
  filename: string,
  range: ByteRange,
): Promise<UploadRange | null> {
  const length = range.end - range.start + 1
  if (filename === '' || filename.includes('/') || filename.includes('\\') || length < 1) {
    return null
  }
  try {
    if ('target' in source) {
      const object = await clientFor(source.target).send(
        new GetObjectCommand({
          Bucket: source.target.bucket,
          Key: `${prefix}/${filename}`,
          Range: `bytes=${range.start}-${range.end}`,
        }),
      )
      if (!object.Body) return null
      return { body: object.Body.transformToWebStream(), length }
    }
    const dir = resolve(source.dir)
    const path = resolve(dir, filename)
    if (!path.startsWith(dir + sep)) return null
    await stat(path)
    const stream = createReadStream(path, { start: range.start, end: range.end })
    return { body: Readable.toWeb(stream) as ReadableStream<Uint8Array>, length }
  } catch (error) {
    if (isMissing(error)) return null
    throw error
  }
}
