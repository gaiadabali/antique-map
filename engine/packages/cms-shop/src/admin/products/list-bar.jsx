/**
 * Above the product list (TASKS.md 27.2.d): the quick filters — All, Drafts, Out of stock, a
 * category — and the bulk move. A server component in `beforeListTable`: it reads the categories
 * and the out-of-stock products as the person (`./data` `outOfStockIds`, offered only to whoever
 * reads every store's stock) and hands the client (`./list-bar-client.jsx`) plain addresses.
 * Bulk publish and unpublish are Payload's own, in the selection bar. `.jsx`: see
 * `../leads/shared.jsx`'s header.
 */
import { outOfStockIds } from './data'
import { activeFilter, filterHref } from './list-filters'
import { ListBarClient } from './list-bar-client'

async function categoriesOf(payload, user, locale) {
  const found = await payload
    .find({
      collection: 'categories',
      depth: 0,
      limit: 200,
      pagination: false,
      overrideAccess: false,
      user,
      draft: true,
      sort: '_order',
      select: { label: true },
      ...(typeof locale === 'string' && locale !== 'all' ? { locale } : {}),
    })
    .catch(() => ({ docs: [] }))
  return found.docs.map((doc) => ({
    id: String(doc.id),
    label: typeof doc.label === 'string' && doc.label !== '' ? doc.label : `#${doc.id}`,
  }))
}

export async function ProductListBar({ payload, user, i18n, searchParams, locale }) {
  if (!payload || !user) return null
  const language = i18n?.language === 'id' ? 'id' : 'en'
  const code = typeof locale === 'object' ? locale?.code : locale
  const [categories, outOfStock] = await Promise.all([
    categoriesOf(payload, user, code),
    outOfStockIds(payload, user),
  ])
  const active = activeFilter(searchParams)
  return (
    <ListBarClient
      language={language}
      active={active.kind === 'category' ? `category:${active.id}` : active.kind}
      links={{
        all: filterHref({ kind: 'all' }),
        drafts: filterHref({ kind: 'drafts' }),
        outOfStock: outOfStock === null ? null : filterHref({ kind: 'outOfStock' }, outOfStock),
      }}
      categories={categories.map((category) => ({
        ...category,
        href: filterHref({ kind: 'category', id: category.id }),
      }))}
    />
  )
}
