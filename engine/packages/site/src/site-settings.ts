/**
 * Public site-settings read for the shell (`shell/site-shell`) and the shop's product page.
 *
 * `site-settings` is owner-only: no public access. The shell's contact, hours and reply promise —
 * and, for the shop, the product page's fixed words and the free-delivery amount — are shown to
 * every visitor, so this loader reads them with `overrideAccess: true` and an explicit `select` of
 * only those public fields. It must never select internal fields such as `leadNotifyEmails` or the
 * AI group. The result is tagged with `settingsTag(site)` (`@engine/cache`'s builder — a tag is
 * never written by hand) because it changes rarely and is safe to share between visitors; it is
 * read in the visitor's language (the cache key carries it).
 *
 * The shop's announcement is not here: it is `shop-header`'s, dated
 * (`server/shop/pages/navigation`).
 *
 * Build safety: this module is used only inside the request path (the root layout awaits
 * `connection()` before rendering), so `cms()` is never called at `next build`. The build must
 * therefore succeed with no `DATABASE_URL`.
 */
import 'server-only'

import type { SiteKey, SiteLocale } from '@engine/config/sites'
import { cms } from '@engine/cms/instance'
import { settingsTag } from '@engine/cache'
import { cacheLife, cacheTag } from 'next/cache'

/** The product page's fixed words as the owner set them; `null` = the lexicon's. */
export type ProductPageSettings = {
  /** May hold `{freeOver}`, the free-delivery amount. */
  readonly deliveryLine: string | null
  readonly finishHelpLabel: string | null
  readonly finishHelp: string | null
}

export type PublicSiteSettings = {
  contact: {
    whatsapp: string | null
    email: string | null
    phone: string | null
  }
  replyPromise: string | null
  hours: string | null
  /** The gallery's; the shop's is `shop-header`'s dated one. */
  announcement: string | null
  social: readonly { platform: string; url: string }[] | null
  /** The shop's alone: the product page's words and the free-delivery amount (whole rupiah). */
  productPage: ProductPageSettings | null
  freeOverIdr: number | null
}

const EMPTY: PublicSiteSettings = {
  contact: { whatsapp: null, email: null, phone: null },
  replyPromise: null,
  hours: null,
  announcement: null,
  social: null,
  productPage: null,
  freeOverIdr: null,
}

const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null

const PRODUCT_PAGE_KEYS = ['deliveryLine', 'finishHelpLabel', 'finishHelp'] as const

function productPageOf(value: unknown): ProductPageSettings {
  const row = (value ?? {}) as Record<string, unknown>
  return Object.fromEntries(
    PRODUCT_PAGE_KEYS.map((key) => [key, str(row[key])]),
  ) as ProductPageSettings
}

/**
 * The shop's product-page words in `locale` alone — no fallback locale — so a field left empty in
 * Indonesian reads empty and the product page shows the Indonesian lexicon's words
 * (`productPageCopy`), not the English setting Payload's default fallback would hand back.
 */
async function readProductPage(locale: SiteLocale): Promise<ProductPageSettings> {
  const payload = await cms()
  const result = await payload.findGlobal({
    slug: 'site-settings',
    // owner-only, as below: these public words alone are selected.
    overrideAccess: true,
    locale,
    fallbackLocale: false,
    select: { shop: { productPage: Object.fromEntries(PRODUCT_PAGE_KEYS.map((k) => [k, true])) } },
  })
  return productPageOf((result.shop as { productPage?: unknown } | undefined)?.productPage)
}

async function readSettings(site: SiteKey, locale: SiteLocale): Promise<PublicSiteSettings> {
  const group = site === 'gallery' ? 'gallery' : 'shop'
  const payload = await cms()
  const [result, productPage] = await Promise.all([
    payload.findGlobal({
      slug: 'site-settings',
      // owner-only: we must read public contact fields as super-user.
      overrideAccess: true,
      locale,
      select: {
        [group]: {
          contact: { whatsapp: true, email: true, phone: true },
          replyPromise: true,
          hours: true,
          social: { platform: true, url: true },
          ...(group === 'shop' ? { delivery: { freeOverIdr: true } } : { announcement: true }),
        },
      },
    }),
    group === 'shop' ? readProductPage(locale) : null,
  ])

  const data = (result[group] ?? {}) as {
    contact?: {
      whatsapp?: string | null
      email?: string | null
      phone?: string | null
    } | null
    replyPromise?: string | null
    hours?: string | null
    announcement?: string | null
    social?: { platform: string; url: string }[] | null
    delivery?: { freeOverIdr?: unknown } | null
  }
  const freeOver = data.delivery?.freeOverIdr
  return {
    contact: {
      whatsapp: data.contact?.whatsapp ?? null,
      email: data.contact?.email ?? null,
      phone: data.contact?.phone ?? null,
    },
    replyPromise: data.replyPromise ?? null,
    hours: data.hours ?? null,
    announcement: group === 'gallery' ? (data.announcement ?? null) : null,
    social: data.social ?? null,
    productPage,
    freeOverIdr:
      typeof freeOver === 'number' && Number.isSafeInteger(freeOver) && freeOver > 0
        ? freeOver
        : null,
  }
}

/**
 * The site's public settings in `locale`. A read that fails answers the empty settings, held for
 * seconds only (`cacheLife('seconds')`), so a database that is down — or absent, as at `next
 * build` — never fails a page, and never pins the gap for long.
 */
export async function loadSiteSettings(
  site: SiteKey,
  locale: SiteLocale,
): Promise<PublicSiteSettings> {
  'use cache'
  cacheTag(settingsTag(site === 'gallery' ? 'gallery' : 'shop'))
  try {
    return await readSettings(site, locale)
  } catch {
    cacheLife('seconds')
    return EMPTY
  }
}
