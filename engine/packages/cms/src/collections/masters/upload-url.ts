/**
 * `POST /api/masters/upload-url` — the first half of a master's upload (TASKS.md 8.3.b;
 * ARCHITECTURE.md §7). A Payload collection endpoint, not an engine route: Payload owns `/api/*`
 * outside `/api/x/` (C13), and this is the collection's own operation.
 *
 * The caller declares the file — its kind, SHA-256, extension, size and what it belongs to — and
 * gets back the key C9 builds for it and a PUT signed for exactly that key, length, type and
 * checksum. It then sends the bytes **straight to the private bucket**, never through this
 * server, and completes by creating the `masters` record (`POST /api/masters`), which the
 * collection's hook checks against what the bucket holds (`./hooks`). Nothing here, nor in the
 * record, is a public URL: the bucket has none to give.
 *
 *   { kind: 'capture', checksum, extension, byteSize, workUid }    → masterKey(workUid, …)
 *   { kind: 'capture', checksum, extension, byteSize, batch }      → intakeMasterKey(brand, batch, …)
 *   { kind: 'print-file', checksum, extension, byteSize, designUid } → printFileKey(brand, designUid, …)
 *
 * An outlet brand — one whose sister is its archive's origin (C1 `sisters[].role`) — uploads print
 * files only; its masters key could not write a capture anyway (`policies/masters-outlet.json`),
 * and this says so before the PUT is refused.
 */
import {
  INTAKE_MASTERS_PREFIX,
  intakeMasterKey,
  masterKey,
  printFileKey,
} from '@engine/media/contract'
import { isSha256Hex, masterContentType, masterUploadProblems } from '@engine/media/storage'
import { addDataAndFileToRequest, type Endpoint, type PayloadHandler } from 'payload'

import { activeBrand } from '../../access/brand'
import { hasRole } from '../../access/roles'
import { MASTER_WRITERS } from './access'
import { isOutlet, type Brand } from './attribution'
import { discardSentFile } from './hooks'
import { mastersStoreFromEnv, STORE_MISSING, type StoreSource } from './store'

export type UploadUrlDeps = { readonly store: StoreSource; readonly brand: () => Brand | null }

export type UploadRequest =
  | { kind: 'capture'; checksum: string; extension: string; byteSize: number; workUid: string }
  | { kind: 'capture'; checksum: string; extension: string; byteSize: number; batch: string }
  | { kind: 'print-file'; checksum: string; extension: string; byteSize: number; designUid: string }

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const isId = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 64 && KEBAB.test(value)
/** `masterKey('intake', …)` would sit under the intake prefix with no brand or batch. */
const RESERVED_WORK_UIDS: readonly string[] = [INTAKE_MASTERS_PREFIX.split('/')[1]!]

const answer = (status: number, message: string, extra: object = {}) =>
  Response.json({ errors: [{ message }], ...extra }, { status })

/** The request's declaration, or every problem with it in words. */
export function parseUploadRequest(
  body: unknown,
): { request: UploadRequest } | { problems: string[] } {
  const input = (body ?? {}) as Record<string, unknown>
  const problems: string[] = []
  const kind = input.kind
  if (kind !== 'capture' && kind !== 'print-file') problems.push('kind: "capture" or "print-file".')
  if (!isSha256Hex(input.checksum))
    problems.push("checksum: the file's SHA-256, 64 lower-case hex digits.")
  const extension = typeof input.extension === 'string' ? input.extension.toLowerCase() : ''
  if (!/^[a-z0-9]{1,8}$/.test(extension)) problems.push('extension: 1–8 letters or digits, no dot.')
  const byteSize = input.byteSize
  if (kind === 'capture' || kind === 'print-file') {
    if (extension)
      problems.push(...masterUploadProblems({ kind, extension, byteSize: Number(byteSize) }))
    const targets = (['workUid', 'batch', 'designUid'] as const).filter(
      (key) => input[key] !== undefined,
    )
    const allowed = kind === 'capture' ? ['workUid', 'batch'] : ['designUid']
    if (targets.length !== 1 || !allowed.includes(targets[0]!)) {
      problems.push(
        kind === 'capture'
          ? 'A capture names its work (workUid) or, before the work exists, its intake batch (batch).'
          : 'A print file names its design (designUid).',
      )
    } else if (!isId(input[targets[0]!])) {
      problems.push(`${targets[0]!}: a kebab-case id of at most 64 characters.`)
    } else if (targets[0] === 'workUid' && RESERVED_WORK_UIDS.includes(input.workUid as string)) {
      problems.push(`workUid: "${String(input.workUid)}" is reserved for intake keys.`)
    }
  }
  if (problems.length > 0) return { problems }
  return { request: { ...input, extension, byteSize: Number(byteSize) } as UploadRequest }
}

/** Where C9 files this upload. */
export function keyFor(request: UploadRequest, brandSlug: string): string {
  const { checksum, extension } = request
  if (request.kind === 'print-file')
    return printFileKey(brandSlug, request.designUid, checksum, extension)
  if ('workUid' in request) return masterKey(request.workUid, checksum, extension)
  return intakeMasterKey(brandSlug, request.batch, checksum, extension)
}

export function uploadUrlHandler(deps: UploadUrlDeps): PayloadHandler {
  return async (req) => {
    if (!req.user) return answer(401, 'Sign in to upload a master.')
    if (!hasRole(req.user, ...MASTER_WRITERS)) return answer(403, 'Your role cannot add masters.')
    await addDataAndFileToRequest(req)
    discardSentFile(req)
    const parsed = parseUploadRequest(req.data)
    if ('problems' in parsed) return answer(400, parsed.problems.join(' '))
    const { request } = parsed
    const brand = deps.brand()
    if (!brand) return answer(503, 'This server serves no brand, so it cannot name the file.')
    if (request.kind === 'capture' && isOutlet(brand)) {
      return answer(
        403,
        "This brand uploads print files only: captures are kept by its sister's archive.",
      )
    }
    const store = deps.store()
    if (!store) return answer(503, STORE_MISSING)
    const existing = await req.payload.find({
      collection: 'masters',
      where: { checksum: { equals: request.checksum } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const already = existing.docs[0]
    if (already) return answer(409, 'This file is already a master.', { id: already.id })
    const storageKey = keyFor(request, brand.slug)
    const upload = await store.presignPut({
      key: storageKey,
      checksum: request.checksum,
      byteSize: request.byteSize,
      contentType: masterContentType(request.kind, request.extension)!,
    })
    return Response.json({
      storageKey,
      upload,
      record: { kind: request.kind, storageKey, checksum: request.checksum },
    })
  }
}

export const uploadUrlEndpoint = (
  deps: UploadUrlDeps = { store: mastersStoreFromEnv, brand: activeBrand },
): Endpoint => ({ path: '/upload-url', method: 'post', handler: uploadUrlHandler(deps) })
