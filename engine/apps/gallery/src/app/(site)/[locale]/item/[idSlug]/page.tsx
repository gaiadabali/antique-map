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
 * redirect a canonical address to itself or open a second one. The param only picks the id.
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
import { Suspense } from 'react'

import { currentBrand } from '../../../../../shell/brand'
import { brandHref } from '../../../../../shell/links'
import { bagLines } from '../../../../../spike/bag'
import { BagSection, ShipToForm, SpikeControls } from '../../../../../spike/forms'
import { takeFormResult } from '../../../../../spike/form-result'
import { parsePublicId } from '../../../../../spike/id-slug'
import { SPIKE_ITEMS } from '../../../../../spike/items'
import { JsIndicator } from '../../../../../spike/js-indicator'
import { spikeMessages } from '../../../../../spike/messages'
import { PurchasePanel, PurchasePanelPlaceholder } from '../../../../../spike/purchase-panel'
import { getAvailability, getItemRecord } from '../../../../../spike/reads'
import { resultText } from '../../../../../spike/result-text'
import { currentShipTo, shipToOptions } from '../../../../../spike/ship-to'

type Props = PageProps<'/[locale]/item/[idSlug]'>

async function resolve({ params }: Props) {
  const { locale, idSlug } = await params
  const { config } = await currentBrand()
  if (!isSupportedLocale(config, locale)) notFound()
  const publicId = parsePublicId(idSlug)
  const record = publicId === null ? null : await getItemRecord(publicId, locale)
  if (record === null) notFound()
  const href = await brandHref()
  const canonical = href('item', { publicId: record.publicId, slug: record.slug }, locale)
  const publicPath = (await headers()).get(PROXY_REQUEST_HEADERS.publicPath)
  if (publicPath !== canonical) permanentRedirect(canonical)
  return { config, locale, record, canonical }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { record, canonical } = await resolve(props)
  return { title: record.title, alternates: { canonical } }
}

export default async function ItemPage(props: Props) {
  const { config, locale, record, canonical } = await resolve(props)
  const [{ t }, shipTo, lines, result, availability] = await Promise.all([
    spikeMessages(locale),
    currentShipTo(config),
    bagLines(),
    takeFormResult(),
    getAvailability(record.publicId),
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
        <p role="status" className="spike-result">
          {resultText(result, t, shipToOptions(config))}
        </p>
      )}
      <ShipToForm t={t} options={shipToOptions(config)} current={shipTo} returnTo={canonical} />
      <Suspense fallback={<PurchasePanelPlaceholder label={t('spike.panel.checking')} />}>
        <PurchasePanel publicId={record.publicId} locale={locale} />
      </Suspense>
      <BagSection
        t={t}
        lines={lines.map((id) => ({ id, title: titles.get(id) ?? String(id) }))}
        returnTo={canonical}
      />
      {process.env.SPIKE_CONTROLS === '1' ? (
        <SpikeControls
          t={t}
          id={record.publicId}
          availability={availability}
          returnTo={canonical}
        />
      ) : null}
      <JsIndicator off={t('spike.js.off')} on={t('spike.js.on')} />
    </article>
  )
}
