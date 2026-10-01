/**
 * No request leaves a temporary file behind (TASKS.md 8.3.h): every Payload endpoint — each
 * collection's, each global's and the root's, built in or custom — removes the files its request's
 * multipart body was streamed into once it has answered, whether it succeeded or threw.
 *
 * **Why every endpoint, not hooks.** The root `upload` option streams a multipart file to disk
 * (`useTempFiles`, `@engine/media/storage` `multipartUploadOptions`) — and Payload 3.90.2 parses the
 * body inside each built-in POST and PATCH endpoint (`wrapInternalEndpoints` →
 * `addDataAndFileToRequest`), for every collection and global, **before access is checked**. It then
 * deletes the file only after an upload collection's operation (`unlinkTempFiles`). So an
 * anonymous POST to `/api/users` with a 90 MiB file part answers 403 and leaves 90 MiB on the disk.
 * Collection hooks cannot close this: `afterOperation` never runs for a request refused before its
 * operation, nor for endpoints that are no operation at all (`/access/:id`, a global's `/access`),
 * globals have no operation hooks, and a file sent under any field name but `file` is in
 * `req.files` alone. The endpoint is where the body is parsed, so the endpoint is where it is
 * cleaned up.
 *
 * **Why after the config is built.** The built-in endpoints are added while Payload sanitises the
 * config — after every plugin has run — so a plugin never sees them. `config.onInit` would, but
 * Payload skips it on the retry after a failed first `getPayload()` (`disableOnInit` once the cache
 * key exists), which is exactly a web process that started before its database. So the built
 * config is wrapped once, as Payload's own Next REST route amends `config.endpoints` (its `/og`).
 *
 * Only a file inside the configured temp folder is ever removed, so no request — nor a handler that
 * puts something else on `req.file` — can steer the clean-up at another path. A failure to remove
 * is logged, never thrown: it must not replace the answer or hide the error being answered.
 */
import { rm } from 'node:fs/promises'
import path from 'node:path'

import { sweepStaleUploads } from '@engine/media/storage'
import type { Endpoint, PayloadHandler, PayloadRequest, SanitizedConfig } from 'payload'

const CLEANS_UP = Symbol.for('@engine/cms/removes-request-temp-files')

type Marked = PayloadHandler & { [CLEANS_UP]?: true }
type Endpoints = Endpoint[] | false | undefined
type RequestFiles = Pick<PayloadRequest, 'file' | 'files'>

/** Payload's own default when `upload.tempFileDir` is unset, resolved as its parser resolves it. */
const PAYLOAD_DEFAULT_TEMP_DIR = 'tmp'

export function tempFileDirOf(config: Pick<SanitizedConfig, 'upload'>): string {
  return path.resolve(config.upload?.tempFileDir ?? PAYLOAD_DEFAULT_TEMP_DIR)
}

function isInside(dir: string, file: string): boolean {
  const relative = path.relative(dir, path.resolve(file))
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
}

/** Every temp file a request's multipart body was parsed into, inside `dir`, each once. */
export function requestTempFilePaths(req: RequestFiles, dir: string): string[] {
  const found = new Set<string>()
  const add = (file: unknown): void => {
    if (Array.isArray(file)) {
      file.forEach(add)
      return
    }
    const tempFilePath = (file as { tempFilePath?: unknown } | null | undefined)?.tempFilePath
    if (typeof tempFilePath === 'string' && isInside(dir, tempFilePath)) found.add(tempFilePath)
  }
  add(req.file)
  for (const file of Object.values(req.files ?? {})) add(file)
  return [...found]
}

/**
 * Removes them, from the folder the request's own config streamed them to — read now, not when the
 * endpoint was wrapped: Payload sanitises a collection's config once per process and reuses it in
 * every later build, so one wrapped endpoint may serve configs with different folders (tests).
 * Payload's own clean-up of an upload collection's file has run by now (it unlinks without
 * `force`, so it must go first); a file already gone is not an error. A request that carried a
 * file also sweeps what a process that died mid-request left (`sweepStaleUploads`).
 */
export async function removeRequestTempFiles(req: PayloadRequest): Promise<void> {
  const config = req.payload?.config
  if (!config) return
  const dir = tempFileDirOf(config)
  const files = requestTempFilePaths(req, dir)
  if (files.length === 0) return
  const logged = (msg: string) => (err: unknown) => req.payload.logger.error({ err, msg })
  for (const file of files) {
    await rm(file, { force: true }).catch(logged(`could not remove the upload temp file ${file}`))
  }
  await sweepStaleUploads(dir).catch(logged(`could not sweep the upload temp folder ${dir}`))
}

/** The handler, made to clean up after itself; a handler already made so is returned as it is. */
export function cleaningUpAfter(handler: PayloadHandler): PayloadHandler {
  if (cleansUp(handler)) return handler
  const wrapped: Marked = async (req) => {
    try {
      return await handler(req)
    } finally {
      await removeRequestTempFiles(req)
    }
  }
  wrapped[CLEANS_UP] = true
  return wrapped
}

export function cleansUp(handler: PayloadHandler): boolean {
  return (handler as Marked)[CLEANS_UP] === true
}

/** New endpoint objects: Payload shares its built-in ones between every collection. */
function wrapEach<T extends Endpoints>(endpoints: T): T {
  if (!Array.isArray(endpoints)) return endpoints
  const wrapped: Endpoint[] = endpoints.map((endpoint: Endpoint) => ({
    ...endpoint,
    handler: cleaningUpAfter(endpoint.handler),
  }))
  return wrapped as T
}

/** Every endpoint of a built config — root, collections, globals — made to clean up. In place. */
export function removingRequestTempFiles(config: SanitizedConfig): SanitizedConfig {
  config.endpoints = wrapEach(config.endpoints)
  for (const collection of config.collections) collection.endpoints = wrapEach(collection.endpoints)
  for (const global of config.globals) global.endpoints = wrapEach(global.endpoints)
  return config
}
