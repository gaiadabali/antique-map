/**
 * What the Catalogue Wall (`/admin`, TASKS.md 16.2) shows is chosen by the address alone:
 * `?site=&state=&q=&page=`. Every filter is a plain link or a GET form, so this file is the one
 * place that reads those four words and writes them back. Anything unknown falls back to the
 * default rather than failing: a stale bookmark still opens the wall.
 */
export const WALL_SITES = ['all', 'gallery', 'shop'] as const
export type WallSite = (typeof WALL_SITES)[number]

/** `ai` is reached from the strip's "AI drafts to check" link only; the filter row has no chip for it. */
export const WALL_STATES = ['all', 'attention', 'drafts', 'published', 'sold', 'ai'] as const
export type WallStateFilter = (typeof WALL_STATES)[number]

export type WallFilter = {
  readonly site: WallSite
  readonly state: WallStateFilter
  readonly q: string
  readonly page: number
}

export const PAGE_SIZE = 24
/** Deep pages of the merged view read `page × 24` of each collection (see `data.ts`); this bounds it. */
export const MAX_PAGE = 100
const MAX_QUERY = 80

type Params = Record<string, string | string[] | undefined> | null | undefined

const one = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? '') : (value ?? '')

export function parseFilter(params: Params): WallFilter {
  const site = one(params?.site)
  const state = one(params?.state)
  const page = Number.parseInt(one(params?.page), 10)
  return {
    site: (WALL_SITES as readonly string[]).includes(site) ? (site as WallSite) : 'all',
    state: (WALL_STATES as readonly string[]).includes(state) ? (state as WallStateFilter) : 'all',
    q: one(params?.q).replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY),
    page: Number.isSafeInteger(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1,
  }
}

/** The address of `filter` with `patch` applied; defaults are left out. A change resets the page. */
export function wallHref(filter: WallFilter, patch: Partial<WallFilter> = {}): string {
  const next = { ...filter, page: 1, ...patch }
  const query = new URLSearchParams()
  if (next.site !== 'all') query.set('site', next.site)
  if (next.state !== 'all') query.set('state', next.state)
  if (next.q !== '') query.set('q', next.q)
  if (next.page > 1) query.set('page', String(next.page))
  const text = query.toString()
  return text === '' ? '/admin' : `/admin?${text}`
}

export const isFiltered = (filter: WallFilter): boolean =>
  filter.site !== 'all' || filter.state !== 'all' || filter.q !== ''
