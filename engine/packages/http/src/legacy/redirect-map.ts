/**
 * The `redirects` rows of one site as a map (TASKS.md 9.4.b, DATA.md §6): every row, paged through,
 * keyed by `redirectKey(site, from, '')` — a row's `from` already carries the query it keeps
 * (`/category/1-maps?s=sold`), exactly as the 9.4a builder keyed it. Takes the Payload it reads
 * through, so the route's loader binds `cms()` and the database test binds its own pushed one.
 */
import type { SiteKey } from '@engine/config/sites'

import { redirectKey } from './key'

export type RedirectCode = 301 | 302 | 410
export type RedirectEntry = { readonly to: string; readonly code: RedirectCode }
export type RedirectMap = ReadonlyMap<string, RedirectEntry>

/** The one Local API call this reads with; `Payload` satisfies it. */
export type RedirectReader = {
  find(args: {
    collection: 'redirects'
    where: { site: { equals: SiteKey } }
    select: { from: true; to: true; code: true }
    depth: 0
    sort: 'id'
    limit: number
    page: number
    pagination: true
    overrideAccess: true
  }): Promise<{
    docs: ReadonlyArray<{ from?: string | null; to?: string | null; code?: string | null }>
    hasNextPage: boolean
  }>
}

const PAGE_SIZE = 1000

function codeOf(raw: string | null | undefined): RedirectCode | null {
  const code = Number(raw)
  return code === 301 || code === 302 || code === 410 ? code : null
}

export async function readRedirectMap(reader: RedirectReader, site: SiteKey): Promise<RedirectMap> {
  const map = new Map<string, RedirectEntry>()
  for (let page = 1; ; page += 1) {
    const result = await reader.find({
      collection: 'redirects',
      where: { site: { equals: site } },
      select: { from: true, to: true, code: true },
      depth: 0,
      sort: 'id',
      limit: PAGE_SIZE,
      page,
      pagination: true,
      // A server-only read of non-public config that is never rendered: the collection's read
      // access is staff-only by design (an editor's session), and this runs for an anonymous
      // visitor's request, so it must bypass access. Only the three fields above leave this module,
      // and only as a Location or a status.
      overrideAccess: true,
    })
    for (const row of result.docs) {
      const code = codeOf(row.code)
      const to = row.to ?? ''
      if (typeof row.from !== 'string' || code === null) continue
      // A 301 or 302 with nowhere to go is a corrupt row: leave it out so it answers 404.
      if (code !== 410 && to === '') continue
      map.set(redirectKey(site, row.from, ''), { to: code === 410 ? '' : to, code })
    }
    if (!result.hasNextPage) return map
  }
}
