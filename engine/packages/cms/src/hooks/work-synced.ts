/**
 * A provenance copy's synced fields are read-only (TASKS.md 8.2.d; requirement 3.7; BRANDS.md §5;
 * CONTENT-MODEL.md §9). On an outlet, a work copied from its sister — `origin` set — takes what
 * the origin's snapshot carries (`validators/work-synced` `SYNCED_PATHS`) from the sister importer
 * alone: any other write that changes one is refused, path by path, by every API. The copy's own
 * fields — its images, SEO, notes — stay editable.
 *
 * - **`origin`** is the importer's: set on a copy's creation, refreshed on each sync, never by a
 *   person — no one turns a work into a copy, or a copy back into a work, by hand.
 * - **`physical`** is the origin's, never synced (C12): a copy holds none.
 *
 * The importer (TASKS.md 27.1) writes on the Local API with no user and
 * `context: { [SISTER_SYNC_CONTEXT]: true }` — a context no REST or admin request can carry.
 */
import { ValidationError, type CollectionBeforeChangeHook, type PayloadRequest } from 'payload'

import {
  changedSyncedPaths,
  holdsAny,
  isProvenanceCopy,
  originChanged,
  type Origin,
} from '../validators/work-synced'
import { asLabel } from './work-facts'

/** The context key the sister importer sets on its writes. */
export const SISTER_SYNC_CONTEXT = '@engine/sister:sync'

/** Whether this write is the sister importer's. */
export function isSisterSync(
  req: Pick<PayloadRequest, 'payloadAPI' | 'user' | 'context'>,
): boolean {
  return req.payloadAPI === 'local' && !req.user && req.context?.[SISTER_SYNC_CONTEXT] === true
}

type Doc = Record<string, unknown>

export const keepSyncedFields: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (isSisterSync(req)) return data
  const sent = data as Doc
  const stored = operation === 'update' ? (originalDoc as Doc | undefined) : undefined
  const origin = (stored?.origin ?? null) as Origin | null
  const errors: Array<{ path: string; message: string; label: string }> = []
  const refuse = (path: string, message: string) =>
    errors.push({ path, message, label: asLabel(path, message) })

  const makesCopy = operation === 'create' && isProvenanceCopy(sent.origin as Origin)
  if (makesCopy || (operation === 'update' && originChanged(sent, stored))) {
    refuse('origin', 'Only the sister sync makes a provenance copy and records where it came from.')
  }
  if (isProvenanceCopy(origin)) {
    const from = origin?.brand ? `the ${origin.brand} archive` : 'the sister archive'
    for (const path of changedSyncedPaths(sent, stored)) {
      refuse(
        path,
        `This copy takes it from ${from}: change it there, and the next sync brings it here.`,
      )
    }
    if ('physical' in sent && holdsAny(sent.physical)) {
      refuse(
        'physical',
        'A provenance copy holds no physical record: the original is the sister’s.',
      )
    }
  }
  if (errors.length === 0) return data
  throw new ValidationError(
    {
      collection: 'works',
      ...(stored?.id === undefined ? {} : { id: stored.id as number }),
      errors,
      req,
    },
    req.t,
  )
}
