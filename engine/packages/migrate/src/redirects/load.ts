/**
 * Loads a site's `redirects` rows into the database (9.4load — 9.4.a/.b only wrote JSON files and a
 * fixture; staging's 44 published works otherwise answer 404 for every legacy URL).
 *
 * Builds the rows with the same `dedupeLegacyUrls` + `buildRedirects` 9.4a used, then **upserts**
 * them keyed on `(site, from)`: a row the database does not have yet is created, one whose `to`,
 * `code` or `source` changed is updated, an identical one is left alone — so a second run with the
 * same inputs reports 0 created and 0 updated. Deletes are never implicit: a row of this site that
 * the current inputs no longer produce is only removed with `prune: true`.
 *
 * One transaction per batch of up to `batchSize` writes (default 500, ticket): a batch either lands
 * whole or not at all, and a refusal partway through never leaves the table half-written for the
 * rows before it.
 */
import type { Payload, PayloadRequest } from 'payload'

import { buildRedirects, type RedirectRow } from './build'
import { dedupeLegacyUrls, type SiteKey } from './normalise'
import type { WorkLookup } from './rules'

export type LoadOptions = {
  readonly site: SiteKey
  readonly urls: readonly string[]
  readonly works: readonly WorkLookup[]
  readonly categories?: Readonly<Record<string, string>>
  /** Delete rows of this site the current inputs no longer produce. Default `false`. */
  readonly prune?: boolean
  /** Count only; writes nothing. Default `false`. */
  readonly dryRun?: boolean
  readonly batchSize?: number
}

export type LoadResult = {
  readonly rows: number
  readonly gone: number
  readonly unresolved: readonly { readonly from: string; readonly reason: string }[]
  readonly created: number
  readonly updated: number
  readonly unchanged: number
  readonly pruned: number
}

const PAGE_SIZE = 1000
const DEFAULT_BATCH_SIZE = 500

export type ExistingRow = {
  readonly id: number
  readonly to: string
  readonly code: '301' | '302' | '410'
  readonly source: 'legacy' | 'editor' | 'slug-change'
}

/** A request in its own transaction, outside any HTTP call — the house style of `import/apply.ts`. */
function requestOf(payload: Payload, transactionID: string | number | undefined): PayloadRequest {
  return {
    payload,
    context: {},
    user: null,
    locale: 'en',
    headers: new Headers(),
    transactionID,
    t: (key: string) => key,
  } as unknown as PayloadRequest
}

async function existingRows(
  payload: Payload,
  site: SiteKey,
): Promise<Map<string, ExistingRow>> {
  const existing = new Map<string, ExistingRow>()
  for (let page = 1; ; page += 1) {
    const result = await payload.find({
      collection: 'redirects',
      where: { site: { equals: site } },
      select: { from: true, to: true, code: true, source: true },
      depth: 0,
      sort: 'id',
      limit: PAGE_SIZE,
      page,
      pagination: true,
      // Internal migration tool, not a visitor's request: the collection's read access is staff-only.
      overrideAccess: true,
    })
    for (const doc of result.docs as unknown as Array<{
      id: number
      from?: string | null
      to?: string | null
      code?: string | null
      source?: string | null
    }>) {
      if (typeof doc.from !== 'string') continue
      existing.set(doc.from, {
        id: doc.id,
        to: doc.to ?? '',
        code: (doc.code ?? '301') as ExistingRow['code'],
        source: (doc.source ?? 'legacy') as ExistingRow['source'],
      })
    }
    if (!result.hasNextPage) return existing
  }
}

/** Whether a stored row already says what the builder produced (`to`, `code`, `source`). */
export function isUnchanged(
  row: Pick<RedirectRow, 'to' | 'code' | 'source'>,
  existing: Pick<ExistingRow, 'to' | 'code' | 'source'>,
): boolean {
  return (
    existing.to === row.to && existing.code === String(row.code) && existing.source === row.source
  )
}

/** `items` split into consecutive chunks of at most `size` (a transaction each). */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) throw new RangeError('batch size must be a positive integer')
  const chunks: T[][] = []
  for (let start = 0; start < items.length; start += size) chunks.push(items.slice(start, start + size))
  return chunks
}

export type LoadPlan = {
  readonly toCreate: readonly RedirectRow[]
  readonly toUpdate: readonly { readonly id: number; readonly row: RedirectRow }[]
  readonly toPrune: readonly { readonly from: string; readonly id: number }[]
  readonly unchanged: number
}

/**
 * The diff between the produced rows and what the database holds, keyed on `from` (one site's
 * rows on both sides). Creates the missing, updates the changed, counts the identical, and lists
 * the stored rows the builder no longer produces for deletion only when `prune` is set.
 */
export function planLoad(
  rows: readonly RedirectRow[],
  existing: ReadonlyMap<string, ExistingRow>,
  prune: boolean,
): LoadPlan {
  const { toCreate, toUpdate, toPrune, unchanged } = planLoad(rows, existing, prune)

  if (!dryRun) {
    await inBatches(payload, toCreate, batchSize, async (req, batch) => {
      for (const row of batch) {
        await payload.create({
          collection: 'redirects',
          data: {
            site,
            from: row.from,
            to: row.to,
            code: String(row.code) as '301' | '302' | '410',
            source: row.source,
          },
          overrideAccess: true,
          req,
        })
      }
    })
    await inBatches(payload, toUpdate, batchSize, async (req, batch) => {
      for (const { id, row } of batch) {
        await payload.update({
          collection: 'redirects',
          id,
          data: { to: row.to, code: String(row.code) as '301' | '302' | '410', source: row.source },
          overrideAccess: true,
          req,
        })
      }
    })
    if (prune) {
      await inBatches(payload, toPrune, batchSize, async (req, batch) => {
        for (const { id } of batch) {
          await payload.delete({ collection: 'redirects', id, overrideAccess: true, req })
        }
      })
    }
  }

  return {
    rows: rows.length,
    gone: gone.length,
    unresolved,
    created: toCreate.length,
    updated: toUpdate.length,
    unchanged,
    pruned: toPrune.length,
  }
}
