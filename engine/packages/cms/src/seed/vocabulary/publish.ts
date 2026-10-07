/**
 * The vocabulary seed's publish step (`--publish`, DATA.md §2): the gallery reads published places,
 * makers and terms only (its loaders filter `_status: 'published'`; the search's place expansion —
 * Batavia ⇄ Jakarta — reads published places), so a seeded vocabulary left in draft hides every
 * historical name from the search and every place, maker and grade from the item page.
 *
 * It publishes **only the rows the seed names** (the committed files' slugs, names and labels),
 * and only those still in draft: a row already published is not touched, and a published row
 * carrying a newer draft keeps its draft (its main row reads `published`). The write sends
 * `_status` alone, so a field a person edited in the admin stays theirs. The one exception is a
 * field publishing demands that the seed itself left blank — a grade's A–D equivalent, which the
 * seed did not write before 2026-10-07 — and that is filled from the committed file, blank only.
 *
 * A row Payload refuses to publish (a publish-only rule the data does not meet) is held and named
 * in the report; the run goes on. Rows publish in the order given, so a place's parent first.
 */
import type { Payload, PayloadRequest } from 'payload'

export type VocabularyCollection = 'places' | 'terms' | 'makers'

export type PublishReport = {
  places: number
  terms: number
  makers: number
  /** Rows Payload refused to publish: `collection #id: message`. */
  held: string[]
}

/** The rows to publish, by collection, in order; `fill` maps a row to its blank-only fields. */
export type PublishTargets = {
  readonly [K in VocabularyCollection]: readonly number[]
} & { readonly fill?: ReadonlyMap<string, Readonly<Record<string, string>>> }

/** The `fill` key of a row: `terms:12`. */
export const fillKey = (collection: VocabularyCollection, id: number) => `${collection}:${id}`

const isBlank = (value: unknown) =>
  value === null || value === undefined || (typeof value === 'string' && value.trim() === '')

export async function publishVocabulary(
  payload: Payload,
  req: PayloadRequest,
  targets: PublishTargets,
): Promise<PublishReport> {
  const report: PublishReport = { places: 0, terms: 0, makers: 0, held: [] }
  for (const collection of ['places', 'terms', 'makers'] as const) {
    report[collection] = await publishDrafts(payload, req, collection, targets, report.held)
  }
  return report
}

async function publishDrafts(
  payload: Payload,
  req: PayloadRequest,
  collection: VocabularyCollection,
  targets: PublishTargets,
  held: string[],
): Promise<number> {
  const ids = [...new Set(targets[collection])]
  let published = 0
  for (let start = 0; start < ids.length; start += 200) {
    const chunk = ids.slice(start, start + 200)
    const { docs } = await payload.find({
      collection,
      req,
      overrideAccess: true,
      depth: 0,
      limit: chunk.length,
      pagination: false,
      where: { and: [{ id: { in: chunk } }, { _status: { not_equals: 'published' } }] },
    })
    const drafts = new Map(
      (docs as unknown as Record<string, unknown>[]).map((doc) => [Number(doc.id), doc]),
    )
    for (const id of chunk) {
      const doc = drafts.get(id)
      if (!doc) continue
      const data: Record<string, unknown> = { _status: 'published' }
      for (const [field, value] of Object.entries(
        targets.fill?.get(fillKey(collection, id)) ?? {},
      )) {
        if (isBlank(doc[field])) data[field] = value
      }
      try {
        await payload.update({ collection, id, data: data as never, req })
        published += 1
      } catch (error: unknown) {
        held.push(`${collection} #${id}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }
  return published
}
