/**
 * The product page's "See the original" slot (`@engine/storefront/pages/product`'s `original`;
 * TASKS.md 23.5.b): for a product with an original's stock number, the line linking the gallery's
 * page for it, once the gallery has answered. In its own Suspense boundary with no fallback, so the
 * page never waits on the gallery to draw the rest; with no answer, not found, or no number, it
 * draws nothing — the product page never fails for the gallery's sake.
 */
import { Suspense } from 'react'

import type { OriginalSlot } from '@engine/storefront/pages/product'
import { OriginalLink } from '@engine/storefront/original-link'
import type { SiteLocale } from '@engine/config/sites'

import { originalFor } from './cached'

async function SeeOriginal({
  stockNumber,
  locale,
}: {
  readonly stockNumber: string
  readonly locale: SiteLocale
}) {
  let work: Awaited<ReturnType<typeof originalFor>> = null
  try {
    work = await originalFor(stockNumber, locale)
  } catch {
    work = null
  }
  return work === null ? null : <OriginalLink title={work.title} href={work.url} locale={locale} />
}

export const originalSlot: OriginalSlot = (product, locale) =>
  product.originalStockNumber === null ? null : (
    <Suspense fallback={null}>
      <SeeOriginal stockNumber={product.originalStockNumber} locale={locale} />
    </Suspense>
  )
