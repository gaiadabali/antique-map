/**
 * The product list's quick filters (TASKS.md 27.2.d; the plan's §3.2: "Draft, Out of stock, by
 * collection"): each is a plain list address Payload's own list reads (`?where[…]`), so the
 * table, its count, its paging and its bulk actions work on the filtered rows unchanged; and the
 * filter a list address shows, to mark it. Pure, for the bar and its tests.
 */
export type Id = number | string

export type QuickFilter =
  | { readonly kind: 'all' }
  | { readonly kind: 'drafts' }
  | { readonly kind: 'outOfStock' }
  | { readonly kind: 'category'; readonly id: string }

export const PRODUCTS_LIST = '/admin/collections/products'

/** The list address for a filter. Out of stock names the products (`ids`), none matching id 0. */
export function filterHref(filter: QuickFilter, outOfStock: readonly Id[] = []): string {
  switch (filter.kind) {
    case 'drafts':
      return `${PRODUCTS_LIST}?where[_status][equals]=draft`
    case 'outOfStock':
      return `${PRODUCTS_LIST}?where[id][in]=${outOfStock.length ? outOfStock.join(',') : '0'}`
    case 'category':
      return `${PRODUCTS_LIST}?where[category][equals]=${encodeURIComponent(filter.id)}`
    default:
      return PRODUCTS_LIST
  }
}

type Params = Record<string, unknown> | null | undefined

/** Every `key[a][b]=value` a search-params object holds, raw (`where[id][in]`) or parsed. */
function flatten(params: unknown, prefix = ''): Array<[string, string]> {
  if (params === null || params === undefined) return []
  if (typeof params !== 'object') return [[prefix, String(params)]]
  if (Array.isArray(params)) {
    // A list of values (`in: ['3', '9']`) is one pair; a list of conditions (`or: [{…}]`) is walked.
    if (params.every((item) => item === null || typeof item !== 'object')) {
      return prefix === '' ? [] : [[prefix, params.map(String).join(',')]]
    }
    return params.flatMap((item, index) => flatten(item, `${prefix}[${index}]`))
  }
  return Object.entries(params as Record<string, unknown>).flatMap(([key, value]) =>
    flatten(value, prefix === '' ? key : `${prefix}[${key}]`),
  )
}

/** The quick filter a list address shows; anything else (a search, Payload's own filters) is "all". */
export function activeFilter(searchParams: Params): QuickFilter {
  const pairs = flatten(searchParams).filter(([key]) => key.startsWith('where'))
  if (pairs.length === 0) return { kind: 'all' }
  for (const [key, value] of pairs) {
    if (/\[_status\]\[equals\]$/.test(key) && value === 'draft') return { kind: 'drafts' }
    if (/\[id\]\[in\]/.test(key)) return { kind: 'outOfStock' }
    const category = /\[category\]\[equals\]$/.test(key)
    if (category && value !== '') return { kind: 'category', id: value }
  }
  return { kind: 'all' }
}

/** The bulk move's request: the selected products (Payload's own selection query) get `category`. */
export function moveRequest(selectionQuery: string, category: Id) {
  const query = selectionQuery.startsWith('?') ? selectionQuery : `?${selectionQuery}`
  return {
    method: 'PATCH' as const,
    url: `/api/products${query}&depth=0`,
    body: { category },
  }
}
