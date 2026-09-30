/**
 * The purchase panel's streamed part (ARCHITECTURE.md §9, DESIGN-SYSTEM.md §7): it reads the
 * `shipTo` cookie and live availability, so it renders inside the page's `<Suspense>`, into a
 * placeholder of reserved height; no purchase control renders before availability is known. It
 * carries no form and no post result — a visitor without JavaScript never sees a streamed part
 * (C2: what such a visitor must act on is never only a streamed part).
 */
import { setTimeout as sleep } from 'node:timers/promises'

import type { LocaleCode } from '@engine/config/schema'

import { currentBrand } from '../shell/brand'
import { spikeMessages } from './messages'
import { getAvailability } from './reads'
import { currentShipTo } from './ship-to'

/** A live check's latency, so the proof can watch the part arrive after the page (spike only). */
function liveLatency(): Promise<void> {
  const ms = Number(process.env.SPIKE_PANEL_DELAY_MS ?? 0)
  return Number.isFinite(ms) && ms > 0 ? sleep(Math.min(ms, 10_000)) : Promise.resolve()
}

export async function PurchasePanel({
  publicId,
  locale,
}: {
  readonly publicId: number
  readonly locale: LocaleCode
}) {
  const { config } = await currentBrand()
  const [shipTo, availability, { t }] = await Promise.all([
    currentShipTo(config),
    getAvailability(publicId),
    spikeMessages(locale),
    liveLatency(),
  ])
  return (
    <section
      className="purchase-panel"
      aria-labelledby="purchase-title"
      data-availability={availability}
    >
      <h2 id="purchase-title">{t('spike.panel.title')}</h2>
      <p>
        {availability === 'sold' || shipTo === null
          ? t('spike.panel.sold')
          : t('spike.panel.available', { currency: shipTo.currency, country: shipTo.country })}
      </p>
    </section>
  )
}

export function PurchasePanelPlaceholder({ label }: { readonly label: string }) {
  return (
    <section className="purchase-panel" aria-busy="true" data-availability="pending">
      <p>{label}</p>
    </section>
  )
}
