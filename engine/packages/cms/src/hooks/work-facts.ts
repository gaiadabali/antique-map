/**
 * What the work guard reads beyond the save itself (`./work-guard`): the record as it will be
 * once this save is merged over what is stored, its title in the default locale, and — from their
 * own records — what each of its images and its master is. Reads go through `req`, so they run in
 * the operation's transaction, with `overrideAccess: true`: a rule must see what is there, not
 * what the writer may read. Pure but for those reads.
 */
import type { IntakeVerdict } from '@engine/media/contract'
import type { PayloadRequest } from 'payload'

import { refId } from '../validators/work-credits'
import type { ImageFacts } from '../validators/work-images'

export type Doc = Record<string, unknown>

/**
 * A refusal's `label`, which Payload lists in the refusal's message and the admin's toast shows
 * item by item, split at commas: the field's name and the message, its commas made dashes.
 */
export const asLabel = (name: string, message: string) =>
  `${name} — ${message.replace(/\.$/, '').replace(/,/g, ' —')}`

const isPlainObject = (value: unknown): value is Doc =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)

/**
 * `data` over `stored`, as Payload will save it: a group sent in part keeps its other fields; an
 * array, a value or a relation sent replaces what was there.
 */
export function mergeOver(stored: Doc | null | undefined, data: Doc): Doc {
  const merged: Doc = { ...(stored ?? {}) }
  for (const [key, value] of Object.entries(data)) {
    const before = merged[key]
    merged[key] =
      isPlainObject(value) && isPlainObject(before) && !('id' in value && 'createdAt' in value)
        ? mergeOver(before, value)
        : value
  }
  return merged
}

export function defaultLocaleOf(req: PayloadRequest): string | null {
  const { localization } = req.payload.config
  return localization ? localization.defaultLocale : null
}

/** A localised value as saved: a string in the request's locale, or every locale's under `all`. */
function inLocale(value: unknown, locale: string): string | null {
  if (typeof value === 'string') return value
  if (isPlainObject(value) && typeof value[locale] === 'string') return value[locale] as string
  return null
}

/** The title in the default locale once this save lands. */
export async function defaultLocaleTitle(
  req: PayloadRequest,
  merged: Doc,
  data: Doc,
  id: unknown,
): Promise<string | null> {
  const locale = defaultLocaleOf(req)
  if (locale === null || !req.locale || req.locale === locale || req.locale === 'all') {
    return inLocale(merged.title, locale ?? '')
  }
  // Saved in another locale: what the default locale holds is stored, unless sent under `all`.
  if (id === undefined || id === null) return null
  const stored = (await (
    req.payload as unknown as {
      findByID: (args: object) => Promise<Doc | null>
    }
  ).findByID({
    collection: 'works',
    id,
    locale,
    draft: true,
    depth: 0,
    disableErrors: true,
    overrideAccess: true,
    req,
    select: { title: true },
  })) as Doc | null
  return inLocale(stored?.title, locale) ?? inLocale(data.title, locale)
}

type MediaRow = {
  id: unknown
  role?: unknown
  provenance?: unknown
  alt?: unknown
  altSource?: unknown
  master?: unknown
}
type MasterRow = {
  id: unknown
  kind?: unknown
  role?: unknown
  work?: unknown
  intake?: { verdict?: unknown }
}

const text = (value: unknown) => (typeof value === 'string' ? value : null)

async function findAll<T>(req: PayloadRequest, collection: string, ids: string[], extra: object) {
  if (ids.length === 0) return [] as T[]
  const found = await (
    req.payload as unknown as {
      find: (args: object) => Promise<{ docs: T[] }>
    }
  ).find({
    collection,
    where: { id: { in: ids } },
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    req,
    ...extra,
  })
  return found.docs
}

/** Each value's facts, in order, read from the media records and their masters. */
export async function imageFacts(
  req: PayloadRequest,
  values: readonly unknown[],
): Promise<ImageFacts[]> {
  const ids = [...new Set(values.map(refId).filter((id): id is string => id !== null))]
  const locale = defaultLocaleOf(req) ?? undefined
  const media = await findAll<MediaRow>(req, 'media', ids, { locale, fallbackLocale: false })
  const byId = new Map(media.map((row) => [String(row.id), row]))
  const masterIds = [
    ...new Set(media.map((row) => refId(row.master)).filter((id): id is string => id !== null)),
  ]
  const masters = await findAll<MasterRow>(req, 'masters', masterIds, {})
  const verdicts = new Map(masters.map((row) => [String(row.id), text(row.intake?.verdict)]))
  return values.map((value) => {
    const id = refId(value)
    const row = id === null ? undefined : byId.get(id)
    if (!row)
      return {
        id: null,
        role: null,
        provenance: null,
        alt: null,
        altSource: null,
        masterVerdict: null,
      }
    const master = refId(row.master)
    return {
      id: String(row.id),
      role: text(row.role),
      provenance: text(row.provenance),
      alt: text(row.alt),
      altSource: text(row.altSource),
      masterVerdict: (master === null
        ? null
        : (verdicts.get(master) ?? null)) as IntakeVerdict | null,
    }
  })
}

/** What a work's `master` must be: a capture of the recto, filed under no other work. */
export async function masterError(
  req: PayloadRequest,
  value: unknown,
  workId: unknown,
): Promise<string | null> {
  const id = refId(value)
  if (id === null) return null
  const [master] = await findAll<MasterRow>(req, 'masters', [id], {})
  if (!master) return 'This master no longer exists: choose another.'
  if (master.kind !== 'capture') return 'A work’s master is a capture, never a print file.'
  if (master.role !== 'recto') return 'A work’s master is a capture of its recto, the whole front.'
  const filedUnder = refId(master.work)
  if (
    filedUnder !== null &&
    workId !== undefined &&
    workId !== null &&
    filedUnder !== String(workId)
  ) {
    return 'This master is filed under another work.'
  }
  return null
}
