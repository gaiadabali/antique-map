/**
 * An upload's temporary file is removed when its request ends (TASKS.md 8.3.d, the 8.3 review's
 * finding 1). Payload streams a multipart file to the OS temp folder (`@engine/media/storage`
 * `multipartUploadOptions`) and deletes it after an upload collection's operation — through
 * `req.file`. But the storage plugin clears `req.file` once it has stored the file in the bucket
 * (`@payloadcms/plugin-cloud-storage` 3.90.2, its afterChange: "Clear to prevent re-processing"),
 * so Payload finds nothing to delete and every stored upload would leave its copy behind: a
 * 90 MiB file per image on a disk that is already nearly full (DEPLOYMENT.md §2).
 *
 * So the path is remembered before the operation runs and removed after it, or after it fails —
 * unless `req.file` still holds it, in which case Payload's own clean-up removes it (and would
 * fail on a file already gone).
 */
import { rm } from 'node:fs/promises'

import { sweepStaleUploads } from '@engine/media/storage'
import type {
  CollectionAfterErrorHook,
  CollectionAfterOperationHook,
  CollectionBeforeOperationHook,
  PayloadRequest,
} from 'payload'

const KEY = 'mediaUploadTempFile'

/**
 * Notes the file's temporary path — a nested operation with no file keeps the outer one's — and
 * sweeps what earlier requests left in the folder.
 */
export const rememberTempFile: CollectionBeforeOperationHook = async ({ req }) => {
  const path = req.file?.tempFilePath
  if (!path) return
  req.context[KEY] = path
  await sweepStaleUploads()
}

async function removeRemembered(req: PayloadRequest): Promise<void> {
  const path = req.context[KEY]
  if (typeof path !== 'string' || req.file?.tempFilePath === path) return
  delete req.context[KEY]
  await rm(path, { force: true })
}

export const removeTempFile: CollectionAfterOperationHook = async ({ req, result }) => {
  await removeRemembered(req)
  return result
}

export const removeTempFileOnError: CollectionAfterErrorHook = async ({ req }) => {
  await removeRemembered(req)
}
