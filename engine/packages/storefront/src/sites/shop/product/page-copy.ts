/**
 * The product page's fixed words (TASKS.md 27.5.c): the delivery line and the help for the
 * finishes — the two signal lines under the price are gone (the owner's feedback of 2026-11-19,
 * TASKS.md 28.2) — from `site-settings.shop.productPage` — the owner's words,
 * one source of truth — or, for a field left empty, the lexicon's (`./copy`).
 *
 * `{freeOver}` in the delivery line is the free-delivery amount of the delivery settings
 * (`site-settings.shop.delivery.freeOverIdr`), formatted as rupiah, so the figure is set once.
 * With no amount set, the clause that names it is left out rather than shown with a hole.
 */
import { formatRupiah } from '@engine/ui/format-rupiah'

import type { ProductPageSettings } from '@engine/site/site-settings'
import type { ProductText } from './copy'

export type ProductPageCopy = {
  readonly delivery: string
  readonly finishHelp: { readonly label: string; readonly text: string }
}

const PLACEHOLDER = '{freeOver}'

/**
 * `template` with `{freeOver}` replaced by the amount in rupiah. Without an amount, the clause that
 * holds the placeholder — from the dash, comma or semicolon before it to the end of its sentence —
 * is dropped, and the placeholder itself if it stands anywhere else.
 */
export function deliveryLine(template: string, freeOverIdr: number | null): string {
  if (!template.includes(PLACEHOLDER)) return template
  if (freeOverIdr !== null && Number.isSafeInteger(freeOverIdr) && freeOverIdr > 0) {
    return template.split(PLACEHOLDER).join(formatRupiah(freeOverIdr))
  }
  const clause = /\s*[—–,;-][^—–,;.]*\{freeOver\}[^.]*/g
  return template
    .replace(clause, '')
    .split(PLACEHOLDER)
    .join('')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** The owner's words where set, else the lexicon's, with the free-delivery amount filled in. */
export function productPageCopy(
  text: ProductText,
  settings: ProductPageSettings | null,
  freeOverIdr: number | null,
): ProductPageCopy {
  const own = settings ?? {
    deliveryLine: null,
    finishHelpLabel: null,
    finishHelp: null,
  }
  return {
    delivery: deliveryLine(own.deliveryLine ?? text('product.delivery'), freeOverIdr),
    finishHelp: {
      label: own.finishHelpLabel ?? text('product.finishHelpLabel'),
      text: own.finishHelp ?? text('product.finishHelp'),
    },
  }
}
