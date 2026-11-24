/**
 * The shop's promotions as the storefront shows them (TASKS.md 28.2; the settings are 28.1's
 * `site-settings.shop.promo` and `.newsletter`): the same-day delivery promise and the newsletter
 * pop-up. `site-settings` is owner-only, so — as the shell's contact read (`@engine/site/site-settings`)
 * — this reads with `overrideAccess: true` and a `select` of exactly these public fields, never the
 * notification addresses or the AI group. Cached under the shop's settings tag, in the visitor's
 * language; a failed read answers "off" for seconds, never an error page.
 *
 * A text left empty is the default words (`STOREFRONT_COPY`). The promise is display only: it
 * changes no price — the free delivery above an amount is the delivery's own `freeOverIdr`.
 */
import 'server-only'

import { cacheLife, cacheTag } from 'next/cache'

import { settingsTag } from '@engine/cache'
import { cms } from '@engine/cms/instance'
import {
  PROMO_CUTOFF_DEFAULT,
  PROMO_TIME_ZONE_DEFAULT,
  STOREFRONT_COPY,
} from '@engine/cms-shop/globals/site-settings/shop'
import type { SiteLocale } from '@engine/config/sites'

export type PromoSettings = {
  readonly enabled: boolean
  readonly text: string
  readonly condition: string
  /** "HH:MM", the weekday cut-off for delivery the same day. */
  readonly cutoff: string
  readonly timeZone: string
  readonly weekdaysOnly: boolean
}

export type NewsletterSettings = {
  readonly enabled: boolean
  readonly title: string
  readonly text: string
}

export type StorefrontSettings = {
  readonly promo: PromoSettings
  readonly newsletter: NewsletterSettings
}

const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null

const CUTOFF = /^([01]\d|2[0-3]):[0-5]\d$/

/** The settings' raw `shop` group, shaped, with the defaults for every empty word. */
export function storefrontSettingsOf(raw: unknown, locale: SiteLocale): StorefrontSettings {
  const group = (raw ?? {}) as {
    promo?: Record<string, unknown>
    newsletter?: Record<string, unknown>
  }
  const promo = group.promo ?? {}
  const newsletter = group.newsletter ?? {}
  const cutoff = str(promo.cutoff)
  return {
    promo: {
      enabled: promo.enabled === true,
      text: str(promo.text) ?? STOREFRONT_COPY.promoText[locale],
      condition: str(promo.condition) ?? STOREFRONT_COPY.promoCondition[locale],
      cutoff: cutoff !== null && CUTOFF.test(cutoff) ? cutoff : PROMO_CUTOFF_DEFAULT,
      timeZone: str(promo.timeZone) ?? PROMO_TIME_ZONE_DEFAULT,
      weekdaysOnly: promo.weekdaysOnly !== false,
    },
    newsletter: {
      enabled: newsletter.enabled === true,
      title: str(newsletter.title) ?? STOREFRONT_COPY.newsletterTitle[locale],
      text: str(newsletter.text) ?? STOREFRONT_COPY.newsletterText[locale],
    },
  }
}

const OFF = (locale: SiteLocale) => storefrontSettingsOf({}, locale)

export async function loadStorefrontSettings(locale: SiteLocale): Promise<StorefrontSettings> {
  'use cache'
  cacheTag(settingsTag('shop'))
  try {
    const payload = await cms()
    const result = await payload.findGlobal({
      slug: 'site-settings',
      // owner-only: the promise's and the pop-up's public words alone are selected.
      overrideAccess: true,
      locale,
      fallbackLocale: false,
      select: {
        shop: {
          promo: {
            enabled: true,
            text: true,
            condition: true,
            cutoff: true,
            timeZone: true,
            weekdaysOnly: true,
          },
          newsletter: { enabled: true, title: true, text: true },
        },
      },
    } as never)
    return storefrontSettingsOf((result as { shop?: unknown }).shop, locale)
  } catch {
    cacheLife('seconds')
    return OFF(locale)
  }
}
