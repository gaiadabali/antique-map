/**
 * The same-day delivery promise (TASKS.md 28.2; the owner's feedback of 2026-11-19, F9): "Free
 * Same Day Delivery in Bali*" with its small print, on the home and the shop pages while the owner
 * has it on (`site-settings.shop.promo`). It promises; it changes no price — the free delivery above
 * an amount is the delivery's own setting, applied by checkout on the server.
 *
 * Whether an order placed now still makes today's delivery — a weekday (when the owner says so)
 * before the cut-off, in the shop's time zone — is judged per request, here, never inside a cache
 * entry; while it does, a line says by when.
 */
import type { SiteLocale } from '@engine/config/sites'

import { loadStorefrontSettings } from '../../../server/shop/settings/storefront'
import { sectionsText } from './copy'
import styles from './sections.module.css'

/** True while an order placed at `now` is still delivered the same day. */
export function sameDayOpen(
  now: Date,
  rule: { readonly cutoff: string; readonly timeZone: string; readonly weekdaysOnly: boolean },
): boolean {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: rule.timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now)
  } catch {
    return false
  }
  const part = (type: string) => parts.find((each) => each.type === type)?.value ?? ''
  if (rule.weekdaysOnly && ['Sat', 'Sun'].includes(part('weekday'))) return false
  return `${part('hour')}:${part('minute')}` < rule.cutoff
}

export async function PromoBanner({ locale }: { readonly locale: SiteLocale }) {
  let settings
  try {
    settings = (await loadStorefrontSettings(locale)).promo
  } catch {
    return null
  }
  if (!settings.enabled) return null
  const t = sectionsText(locale)
  const open = sameDayOpen(new Date(), settings)
  return (
    <section className={styles.promo} aria-label={t('promo.label')}>
      <p className={styles.promoText}>{settings.text}</p>
      <p className={styles.promoNote}>
        {settings.condition}
        {open ? <> {t('promo.today', { time: settings.cutoff })}</> : null}
      </p>
    </section>
  )
}
