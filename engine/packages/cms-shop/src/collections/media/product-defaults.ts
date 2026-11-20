/**
 * A product photo's intake, filled in (the plan's §3.2; TASKS.md 27.1.d, 27.2.b): an image
 * uploaded **for a product** — the product editor names it in `forProduct` — starts as a product
 * photograph, flat, with its alt text the product's name. What the uploader sets wins; the alt
 * stays editable like any other.
 *
 * - **Only at creation, only when asked.** Without `forProduct` nothing is filled: an image
 *   uploaded anywhere else still declares its subject, role and provenance itself — provenance
 *   above all, which decides the synthetic label (`@engine/cms-core/collections/media` `fields`).
 *   The product editor is where a product photograph is the plain case, and the uploader can still
 *   choose a mockup there before saving.
 * - **Set once still holds.** These are the create's values; after it only the owner corrects
 *   subject, role or provenance (`freezeAfterCreate`, unchanged).
 * - **The name is read as the uploader may read it** (`overrideAccess: false`, drafts included —
 *   a new product is a draft). A product they cannot read gives no alt, and the image is refused
 *   for want of one, as before.
 *
 * `forProduct` is virtual: it has no column and is never stored on the image.
 */
import { isBlank } from '@engine/cms-core/fields'
import type { CollectionBeforeValidateHook, Field } from 'payload'

/** The product an image is being uploaded for; read by `productImageDefaults` alone. */
export const forProductField: Field = {
  name: 'forProduct',
  type: 'relationship',
  relationTo: 'products',
  virtual: true,
  label: { en: 'Uploaded for product', id: 'Diunggah untuk produk' },
  admin: { hidden: true },
}

/** A product photo's intake: subject, role and provenance, as most product photos are. */
export const PRODUCT_IMAGE_DEFAULTS = {
  subject: 'product',
  role: 'flat',
  provenance: 'photograph',
} as const

type Data = Record<string, unknown>

const idOf = (value: unknown): number | string | null => {
  const id = typeof value === 'object' && value !== null ? (value as { id?: unknown }).id : value
  return typeof id === 'number' || (typeof id === 'string' && id !== '') ? id : null
}

export const productImageDefaults: CollectionBeforeValidateHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create' || !data) return data
  // A product photo's defaults: a video or a PDF has no subject, role or provenance.
  // Read here, not via the media barrel: the photo uploader's client imports this file.
  const mimeType = (data as Data).mimeType
  if (typeof mimeType === 'string' && !mimeType.startsWith('image/')) return data
  const productId = idOf((data as Data).forProduct)
  if (productId === null) return data
  const next: Data = { ...data }
  for (const [field, value] of Object.entries(PRODUCT_IMAGE_DEFAULTS)) {
    if (isBlank(next[field])) next[field] = value
  }
  // A one-locale create only (the admin's): an all-locales write brings its own alt per locale.
  if (req.locale !== 'all' && isBlank(next.alt)) {
    const product = (await req.payload
      .findByID({
        collection: 'products',
        id: productId,
        depth: 0,
        draft: true,
        select: { name: true },
        overrideAccess: false,
        disableErrors: true,
        req,
      })
      .catch(() => null)) as { name?: unknown } | null
    const name = typeof product?.name === 'string' ? product.name.trim() : ''
    if (name !== '') {
      next.alt = name
      // Built from the record, not typed: the cataloguer's to improve.
      if (isBlank(next.altSource)) next.altSource = 'baseline'
    }
  }
  return next
}
