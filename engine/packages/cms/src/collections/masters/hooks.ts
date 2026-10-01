/**
 * The `masters` collection's rules on every write path (TASKS.md 8.3.b, 8.3.f): a record is made
 * only for a file that is really in the private bucket, and is the file it says.
 *
 * Creating the record is how a presigned upload completes: the client PUT the bytes straight to
 * the bucket, then asks for the record, and `verifyInBucket` asks the bucket what it holds under
 * the key — the size and the SHA-256 the storage itself checked on the way in (`x-amz-checksum-
 * sha256`, signed into the URL by `./upload-url`). The checksum is then recorded, never trusted.
 * A file put there before any record could exist (the pilot set, OA3) has no stored checksum;
 * only the intake import, on the Local API, may then hash it (`context.verifyByHash`).
 */
import { formatBytes, MASTER_UPLOAD_MAX_BYTES } from '@engine/media/storage'
import {
  ValidationError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeOperationHook,
  type CollectionBeforeValidateHook,
  type PayloadRequest,
} from 'payload'

import { activeBrand } from '../../access/brand'
import { mastersStoreFromEnv, STORE_MISSING, type StoreSource } from './store'
import { intakeSegments, masterProblems, type FieldProblem, type MasterInput } from './validators'

const SLUG = 'masters'
type Data = Record<string, unknown>

function refuse(errors: FieldProblem[]): never {
  throw new ValidationError({ collection: SLUG, errors: errors.map((e) => ({ ...e })) })
}

/**
 * A master's bytes never come through the app (`./index`), so a file sent along with a request is
 * dropped before anything else runs: no hook sees it and nothing stores it. Its temporary copy is
 * left on `req.files`, where the clean-up every endpoint runs once it has answered finds and
 * removes it (`hooks/request-temp-files`, TASKS.md 8.3.h).
 */
export function discardSentFile(req: Pick<PayloadRequest, 'file'>): void {
  req.file = undefined
}

export const dropSentFile: CollectionBeforeOperationHook = ({ args, req }) => {
  discardSentFile(req)
  return args
}

/**
 * On a create, what the key already says: the owning brand (an intake key's own, else this
 * process's brand) and an intake key's batch — so the import and the upload flow need not repeat
 * them, and can never contradict them.
 */
export const fillFromKey: CollectionBeforeValidateHook = ({ data, operation }) => {
  if (operation !== 'create' || !data) return data
  const next: Data = { ...data }
  const intake = typeof next.storageKey === 'string' ? intakeSegments(next.storageKey) : null
  next.brand ??= intake?.brand ?? activeBrand()?.slug
  if (intake) {
    const group = (next.intake ?? {}) as Data
    next.intake = { ...group, batch: group.batch ?? intake.batch }
  }
  return next
}

/** Every consistency rule at once, on the record as it will be saved. */
export const checkConsistency: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  const merged = { ...(originalDoc as Data | undefined), ...(data as Data | undefined) }
  const problems = masterProblems(merged as MasterInput)
  if (problems.length > 0) refuse(problems)
  return data
}

/**
 * What a master is never changes: its kind, its checksum and its owning brand. Its key moves once — a capture filed
 * from its intake key under its work's uid (TASKS.md 15.4) — and only on the Local API, where the
 * filing job runs; a request through the admin or REST never re-points a record at another file.
 */
export const keepWhatIsFixed: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update' || !originalDoc) return data
  const errors: FieldProblem[] = []
  for (const field of ['kind', 'checksum', 'brand'] as const) {
    if (field in data && data[field] !== originalDoc[field]) {
      errors.push({ path: field, message: `A master's ${field} never changes: make a new record.` })
    }
  }
  if (
    'storageKey' in data &&
    data.storageKey !== originalDoc.storageKey &&
    req.payloadAPI !== 'local'
  ) {
    errors.push({
      path: 'storageKey',
      message: 'A master is moved only by filing it, never by editing.',
    })
  }
  if (errors.length > 0) refuse(errors)
  // What the bucket said of the file is the bucket's to say: a request cannot restate it.
  if (req.payloadAPI === 'local') return data
  return { ...data, byteSize: originalDoc.byteSize, contentType: originalDoc.contentType }
}

/** Asks the bucket for the file a new or moved record names; records its size and type. */
export function verifyInBucket(
  source: StoreSource = mastersStoreFromEnv,
): CollectionBeforeChangeHook {
  return async ({ context, data, operation, originalDoc, req }) => {
    const key = (data.storageKey ?? originalDoc?.storageKey) as string
    const checksum = (data.checksum ?? originalDoc?.checksum) as string
    if (operation === 'update' && key === originalDoc?.storageKey) return data
    const store = source()
    if (!store) refuse([{ path: 'storageKey', message: STORE_MISSING }])
    const stored = await store.head(key)
    if (!stored) {
      refuse([
        {
          path: 'storageKey',
          message: `There is no file at ${key} in the masters bucket: upload it first, with the URL the upload step gives.`,
        },
      ])
    }
    let found = stored.checksum
    if (found === null && context.verifyByHash === true && req.payloadAPI === 'local') {
      found = await store.hash(key)
    }
    if (found === null) {
      refuse([
        {
          path: 'checksum',
          message:
            'The file was stored without its checksum, so it cannot be verified: upload it again with the URL the upload step gives.',
        },
      ])
    }
    if (found !== checksum) {
      refuse([
        { path: 'checksum', message: `The file at ${key} is not the one this checksum names.` },
      ])
    }
    if (stored.byteSize > MASTER_UPLOAD_MAX_BYTES) {
      refuse([
        {
          path: 'storageKey',
          message: `A master may be at most ${formatBytes(MASTER_UPLOAD_MAX_BYTES)}.`,
        },
      ])
    }
    return { ...data, byteSize: stored.byteSize, contentType: stored.contentType }
  }
}
