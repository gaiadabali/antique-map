/**
 * The product list's thumbnail and total-stock columns (TASKS.md 27.2.d; the plan's §3.2: "small
 * photos, price, total stock, status"). Server components for a field's `admin.components.Cell`:
 * Payload hands a cell the row but not the request, so the person is read once per request from
 * the session (`viewerOf`) and every read is theirs (`overrideAccess: false`, `./data`). The
 * page's stock totals are one query (`totalsBatch`), not one per row. `.jsx`: see
 * `../leads/shared.jsx`'s header.
 */
import { headers } from 'next/headers'
import { cache } from 'react'

import { L } from './copy'
import { coverOf, stockTotals, totalsBatch } from './data'

/** The signed-in person, once per request. */
const viewerOf = cache(async (payload) => {
  try {
    const { user } = await payload.auth({ headers: await headers() })
    return user ?? null
  } catch {
    return null
  }
})

/** One batch of stock totals per request and person. */
const batchOf = cache((payload, user) => totalsBatch((ids) => stockTotals(payload, user, ids)))

function languageOf(i18n) {
  return i18n?.language === 'id' ? 'id' : 'en'
}

export async function ProductPhotoCell({ cellData, payload, i18n }) {
  const user = payload ? await viewerOf(payload) : null
  const url = payload ? await coverOf(payload, user, cellData) : null
  if (!url) {
    return <span className="pe-thumb pe-thumb--none">{L('noPhoto', languageOf(i18n))}</span>
  }
  return <img className="pe-thumb" src={url} alt="" loading="lazy" />
}

export async function ProductStockCell({ rowData, payload, i18n }) {
  const id = rowData?.id
  if (id === undefined || id === null || !payload) return null
  const user = await viewerOf(payload)
  if (!user) return null
  const total = await batchOf(payload, user)(id)
  const language = languageOf(i18n)
  if (total <= 0) return <span className="pe-tag pe-tag--danger">{L('outOfStock', language)}</span>
  return <span className="pe-num">{L('unitsInStock', language, { n: total })}</span>
}
