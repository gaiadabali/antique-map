/**
 * The product's own buttons beside Payload's Save and Publish (TASKS.md 27.2.d; the plan's §3.2):
 * Duplicate, and View on the site. A server component in `edit.beforeDocumentControls`: it finds
 * the product's public address — the shop's canonical origin and its product route, for the
 * published version only (a draft has no page) — and leaves the buttons to the client
 * (`./doc-actions-client.jsx`). Duplicate is for those who make products (`PRODUCT_WRITERS`); the
 * duplicate operation checks `create` again. `.jsx`: see `../leads/shared.jsx`'s header.
 */
import { hasRole } from '@engine/cms-core/access'
import { createHref, SITES, appOrigin } from '@engine/config/sites'

import { PRODUCT_WRITERS } from '../../collections/products/access'
import { DocActionsClient } from './doc-actions-client'

async function publicUrl(payload, user, id, locale) {
  const doc = await payload
    .findByID({
      collection: 'products',
      id,
      depth: 0,
      draft: false,
      overrideAccess: false,
      user,
      disableErrors: true,
      select: { slug: true, _status: true },
    })
    .catch(() => null)
  if (!doc || doc._status !== 'published' || typeof doc.slug !== 'string' || doc.slug === '') {
    return null
  }
  const supported = SITES.shop.locales.supported
  const at = supported.includes(locale) ? locale : SITES.shop.locales.default
  return `${appOrigin('shop') ?? ''}${createHref(SITES.shop)('product', { slug: doc.slug }, at)}`
}

export async function ProductDocActions({ id, payload, user, i18n, locale }) {
  if (id === undefined || id === null || id === '' || !payload) return null
  const language = i18n?.language === 'id' ? 'id' : 'en'
  const url = await publicUrl(payload, user, id, locale?.code ?? locale)
  return (
    <DocActionsClient
      id={String(id)}
      url={url}
      canDuplicate={hasRole(user, ...PRODUCT_WRITERS)}
      language={language}
    />
  )
}
