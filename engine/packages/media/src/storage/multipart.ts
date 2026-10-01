/**
 * How Payload parses a multipart request (its root `upload` option; TASKS.md 8.3.d): the one way
 * a file reaches the app server — a `media` upload through the admin or REST.
 *
 * - **The limit is the media limit.** Payload's own default stops a file at 20 MiB and a request
 *   at 50 MiB, before any collection hook sees it; this raises both to `MEDIA_UPLOAD_MAX_BYTES`
 *   and the file plus `MULTIPART_ENVELOPE_BYTES` for the form's other parts. A larger file is
 *   aborted while it streams in, answered 413 — the media collection's own hook says the same for
 *   the Local API, which parses nothing.
 * - **To disk, not memory.** `useTempFiles` streams each file to `UPLOAD_TEMP_DIR`, so a request
 *   holds a few kilobytes of memory rather than up to 90 MiB, and several at once cannot exhaust
 *   the process. The folder is under the machine's temp directory — never the repository, never
 *   the release. Payload removes a file once an upload collection's operation ends (and `media`
 *   once the storage plugin has hidden it from Payload, `@engine/cms` `media/temp-files`); a
 *   collection that takes no file discards one sent to it at once (`masters`).
 * - **Nothing left lying.** Payload parses a multipart body for every collection's POST and PATCH,
 *   before access is checked, and removes the file only for an upload collection, so a file sent
 *   to any other collection would stay in the folder. `sweepStaleUploads()` removes whatever has
 *   been there longer than any request may last (`STALE_UPLOAD_MS`); the media and masters
 *   collections run it, and a root clean-up for every collection is SCH's (the 8.3 report).
 */
import { readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { MEDIA_UPLOAD_MAX_BYTES } from './limits'

/** Room for the multipart boundaries and the `_payload` JSON beside the file. */
export const MULTIPART_ENVELOPE_BYTES = 4 * 1024 * 1024

export const UPLOAD_TEMP_DIR = join(tmpdir(), 'indies-uploads')

/** Longer than any upload may take, even 90 MiB on a slow line; Payload's own idle timeout is 60 s. */
export const STALE_UPLOAD_MS = 30 * 60 * 1000

/**
 * Removes the files in `dir` untouched for longer than `maxAgeMs`, and answers how many — none a
 * request still writes or reads, since each is touched while it streams and used at once after.
 */
export async function sweepStaleUploads(
  dir: string = UPLOAD_TEMP_DIR,
  maxAgeMs: number = STALE_UPLOAD_MS,
  now: number = Date.now(),
): Promise<number> {
  const names = await readdir(dir).catch(() => [] as string[])
  let removed = 0
  for (const name of names) {
    const path = join(dir, name)
    const info = await stat(path).catch(() => null)
    if (!info?.isFile() || now - info.mtimeMs <= maxAgeMs) continue
    await rm(path, { force: true })
    removed += 1
  }
  return removed
}

/** Payload's `upload` config: the busboy limits and where files stream to while a request runs. */
export function multipartUploadOptions(tempFileDir: string = UPLOAD_TEMP_DIR) {
  return {
    abortOnLimit: true,
    limits: { fileSize: MEDIA_UPLOAD_MAX_BYTES, files: 1 },
    requestSizeLimit: MEDIA_UPLOAD_MAX_BYTES + MULTIPART_ENVELOPE_BYTES,
    useTempFiles: true,
    tempFileDir,
  }
}
