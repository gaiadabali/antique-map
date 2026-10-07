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

type ExistingRow = {
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

function unchanged(row: RedirectRow, existing: ExistingRow): boolean {
  return existing.to === row.to && existing.code === String(row.code) && existing.source === row.source
}

/** `items` split into chunks of `size`, each run inside its own transaction. */
async function inBatches<T>(
  payload: Payload,
  items: readonly T[],
  size: number,
  run: (req: PayloadRequest, batch: readonly T[]) => Promise<void>,
): Promise<void> {
  for (let start = 0; start < items.length; start += size) {
    const batch = items.slice(start, start + size)
    const transactionID = ((await payload.db.beginTransaction()) ?? undefined) as
      | string
      | number
      | undefined
    const req = requestOf(payload, transactionID)
    try {
      await run(req, batch)
      if (transactionID !== undefined) await payload.db.commitTransaction(transactionID)
    } catch (error) {
      if (transactionID !== undefined) {
        await payload.db.rollbackTransaction(transactionID).catch(() => undefined)
      }
      throw error
    }
  }
}

export async function loadRedirects(payload: Payload, options: LoadOptions): Promise<LoadResult> {
  const { site, works, prune = false, dryRun = false } = options
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE
  const categories = options.categories ?? {}

  const uniqueUrls = dedupeLegacyUrls(site, options.urls)
  const { rows, gone, unresolved } = buildRedirects({ site, urls: uniqueUrls, works, categories })
  const existing = await existingRows(payload, site)

  const toCreate: RedirectRow[] = []
  const toUpdate: Array<{ id: number; row: RedirectRow }> = []
  let unchangedCount = 0
  for (const row of rows) {
    const found = existing.get(row.from)
    if (!found) toCreate.push(row)
    else if (unchanged(row, found)) unchangedCount += 1
    else toUpdate.push({ id: found.id, row })
  }

  const produced = new Set(rows.map((row) => row.from))
  const toPrune = prune ? [...existing.entries()].filter(([from]) => !produced.has(from)) : []

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
        for (const [, found] of batch) {
          await payload.delete({ collection: 'redirects', id: found.id, overrideAccess: true, req })
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
    unchanged: unchangedCount,
    pruned: toPrune.length,
  }
}
