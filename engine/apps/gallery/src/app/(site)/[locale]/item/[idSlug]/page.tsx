/**
 * The item route — at spike fidelity (TASKS.md 4.1.e; the item surface is phase 33's). The proxy
 * rewrites `/product/{id}-{slug}` here (C10); the route resolves the item by public id, and answers
 * one permanent redirect to the current URL whenever the address asked for is not, byte for byte,
 * the one `href()` spells — an old link's slug, an encoded or odd spelling, `b%61li` for `bali` —
 * so an item has exactly one 200 address (MIGRATION.md §6).
 *
 * It compares the public path the proxy passed on (C13 `PROXY_REQUEST_HEADERS.publicPath`: the
 * browser's own spelling, overwriting any a client sent), never a spelling of the param: Next
 * 16.3.6 hands this page `idSlug` still percent-encoded and `generateMetadata` the same segment
 * decoded once (the 4.1.e spike), so any comparison of the param — or a decode of it — would
 * redirect a canonical address to itself or open a second one. The param only picks the id; the
 * rule is `src/item/canonical.ts`, which outlives this spike page.
 *
 * What renders where (ARCHITECTURE.md §9, §11): the record is a `'use cache'` read tagged
 * `item:<id>`; the page body — the title, a post's result, the ship-to form, the bag and its forms —
 * renders at request time in the first flush, so it reads and works without JavaScript; only the
 * purchase panel, which reads the `shipTo` cookie and live availability, streams inside
 * `<Suspense>`, and it carries no form.
 */
import '../../../../../spike/spike.css'

import { PROXY_REQUEST_HEADERS } from '@engine/http/manifest'
import { isSupportedLocale } from '@engine/i18n'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound, permanentRedirect } from 'next/navigation'
import { cache, Suspense } from 'react'

import { canonicalRedirect, parsePublicId } from '../../../../../item/canonical'
import { currentBrand } from '../../../../../shell/brand'
import { brandHref } from '../../../../../shell/links'
import { bagLines } from '../../../../../spike/bag'
import { spikeControlsOn, spikeRoutesOn } from '../../../../../spike/flags'
import { BagSection, ShipToForm, SpikeControls } from '../../../../../spike/forms'
import { takeFormResult } from '../../../../../spike/form-result'
import { SPIKE_ITEMS } from '../../../../../spike/items'
import { JsIndicator } from '../../../../../spike/js-indicator'
import { spikeMessages } from '../../../../../spike/messages'
import { PurchasePanel, PurchasePanelPlaceholder } from '../../../../../spike/purchase-panel'
import { getAvailability, getItemRecord } from '../../../../../spike/reads'
import { resultText } from '../../../../../spike/result-text'
import { currentShipTo, shipToOptions } from '../../../../../spike/ship-to'

type Props = PageProps<'/[locale]/item/[idSlug]'>

/**
 * The item and its canonical address, once per request for the metadata and the page alike
 * (React `cache`). Off unless the spike is on (`SPIKE_ROUTES=1`, a workstation's or CI's): the
 * fixture items never reach a host (senior-fe #3).
 */
const resolveItem = cache(async (locale: string, publicId: number | null) => {
  if (!spikeRoutesOn()) notFound()
  const { config } = await currentBrand()
  if (!isSupportedLocale(config, locale)) notFound()
  const record = publicId === null ? null : await getItemRecord(publicId, locale)
  if (record === null) notFound()
  const href = await brandHref()
  const canonical = href('item', { publicId: record.publicId, slug: record.slug }, locale)
  const redirectTo = canonicalRedirect(
    (await headers()).get(PROXY_REQUEST_HEADERS.publicPath),
    canonical,
  )
  if (redirectTo !== null) permanentRedirect(redirectTo)
  return { config, locale, record, canonical }
})

async function resolve({ params }: Props) {
  const { locale, idSlug } = await params
  // Keyed by the id, not the segment: the page and its metadata get two spellings of the segment.
  return resolveItem(locale, parsePublicId(idSlug))
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { record, canonical } = await resolve(props)
  return { title: record.title, alternates: { canonical } }
}

export default async function ItemPage(props: Props) {
  const { config, locale, record, canonical } = await resolve(props)
  const controls = spikeControlsOn()
  // Availability is the panel's, which streams; the body reads it only for the spike's controls,
  // so with them off the first flush never waits on it (senior-fe #7).
  const [{ t }, shipTo, lines, result, availability] = await Promise.all([
    spikeMessages(locale),
    currentShipTo(config),
    bagLines(),
    takeFormResult(),
    controls ? getAvailability(record.publicId) : null,
  ])
  const titles = new Map(SPIKE_ITEMS.map((item) => [item.publicId, item.title[locale]]))
  return (
    <article className="spike-item">
      <h1>{record.title}</h1>
      <p className="spike-meta">
        {t('spike.record', {
          id: String(record.publicId),
          edition: record.edition,
          at: record.computedAt,
        })}
      </p>
      {result === null ? null : (
        // Present at load, so a live region alone would not be announced: focus moves to it once
        // the page is interactive (senior-fe #14); without JavaScript it is read in order.
        <p role="status" className="spike-result" tabIndex={-1} autoFocus>
          {resultText(result, t, shipToOptions(config))}
        </p>
      )}
      <ShipToForm t={t} options={shipToOptions(config)} current={shipTo} returnTo={canonical} />
      {/* The live region wraps the boundary, so the streamed panel is announced when it lands. */}
      <div aria-live="polite">
        <Suspense fallback={<PurchasePanelPlaceholder label={t('spike.panel.checking')} />}>
          <PurchasePanel publicId={record.publicId} locale={locale} />
        </Suspense>
      </div>
      <BagSection
        t={t}
        lines={lines.map((id) => ({ id, title: titles.get(id) ?? String(id) }))}
        returnTo={canonical}
      />
      {availability === null ? null : (
        <SpikeControls
          t={t}
          id={record.publicId}
          availability={availability}
          returnTo={canonical}
        />
      )}
      <JsIndicator off={t('spike.js.off')} on={t('spike.js.on')} />
    </article>
  )
}
