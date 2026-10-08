/**
 * 10.6.f clause 3: no price figure in any gallery HTML, RSC or JSON-LD. For each of the 70 sample
 * works (published, each with an owner-only asking price): the item page in en and id, as HTML and as
 * RSC (`RSC: 1`), with its JSON-LD. Anonymous GETs only, one at a time, 100 ms apart.
 */
import { expect, request as newRequest, test } from '@playwright/test'

import {
  GALLERY,
  currencyFigureRegex,
  figureRegex,
  jsonLdBlocks,
  pause,
  readSample,
} from './support'

const sample = readSample()
const YEAR_LIKE = (n: number) => n >= 1000 && n <= 2100
const itemUrl = (id: number, locale: 'en' | 'id') =>
  `${GALLERY}${locale === 'en' ? '/product/' : '/id/produk/'}${id}`

test('the sample is the 70 priced works', () => {
  console.log(`year-like prices (standalone check not applicable): ${sample.filter((w) => YEAR_LIKE(w.price)).map((w) => `${w.publicId}=${w.price}`).join(' ')}`)
  expect(sample).toHaveLength(70)
  expect(Math.max(...sample.map((s) => s.price))).toBe(280000)
})

test('no asking price in the item HTML, RSC or JSON-LD of 70 priced works, en and id', async () => {
  test.setTimeout(900_000)
  const api = await newRequest.newContext({ extraHTTPHeaders: { 'User-Agent': 'indies-qa-10.6f' } })
  const failures: string[] = []
  let documents = 0
  let jsonLd = 0
  try {
    for (const work of sample) {
      for (const locale of ['en', 'id'] as const) {
        for (const kind of ['html', 'rsc'] as const) {
          const res = await api.get(itemUrl(work.publicId, locale), {
            headers: kind === 'rsc' ? { RSC: '1' } : { Accept: 'text/html' },
          })
          const where = `${work.publicId} ${locale} ${kind}`
          if (res.status() !== 200) {
            failures.push(`${where}: status ${res.status()}`)
            continue
          }
          const body = await res.text()
          documents += 1
          if (/askingPrice/i.test(body)) failures.push(`${where}: askingPrice`)
          if (/\bUSD\b/.test(body)) failures.push(`${where}: USD`)
          if (/\?"(?:price|offers|priceCurrency|lowPrice|highPrice)\?"\s*:/.test(body))
            failures.push(`${where}: a price/offers JSON key`)
          if (currencyFigureRegex(work.price).test(body))
            failures.push(`${where}: ${work.price} beside a currency`)
          // A price that is also a plausible year (1000-2100: e.g. 1900 vs "c. 1900") cannot be told
          // from the work's own date by a standalone match; those prices get the currency, key and
          // JSON-LD checks only, and are listed in docs/gates/review-content.md.
          if (work.price >= 1000 && !YEAR_LIKE(work.price) && figureRegex(work.price).test(body))
            failures.push(`${where}: standalone ${work.price}`)
          if (kind === 'html') {
            const blocks = jsonLdBlocks(body)
            jsonLd += blocks.length
            const text = JSON.stringify(blocks)
            if (/"(?:price|offers|priceCurrency|lowPrice|highPrice)"/.test(text))
              failures.push(`${where}: price/offers in JSON-LD`)
          }
          await pause(100)
        }
      }
    }
  } finally {
    await api.dispose()
  }
  console.log(`scanned ${documents} documents (${jsonLd} JSON-LD blocks)`)
  expect(documents, '70 works x 2 locales x (HTML, RSC)').toBe(280)
  expect(failures, failures.join('\n')).toEqual([])
})

test('no sample figure on /browse, /search?q=bali, the sitemap', async () => {
  const api = await newRequest.newContext({ extraHTTPHeaders: { 'User-Agent': 'indies-qa-10.6f' } })
  const failures: string[] = []
  const urls = [
    `${GALLERY}/browse`,
    `${GALLERY}/browse?availability=sold`,
    `${GALLERY}/id/jelajah`,
    `${GALLERY}/search?q=bali`,
    `${GALLERY}/sitemap.xml`,
  ]
  try {
    for (const url of urls) {
      for (const kind of ['html', 'rsc'] as const) {
        if (kind === 'rsc' && url.endsWith('.xml')) continue
        const res = await api.get(url, {
          headers: kind === 'rsc' ? { RSC: '1' } : {},
          maxRedirects: 5,
        })
        expect(res.status(), `${url} ${kind}`).toBe(200)
        const body = await res.text()
        if (/askingPrice/i.test(body)) failures.push(`${url} ${kind}: askingPrice`)
        if (/\bUSD\b/.test(body)) failures.push(`${url} ${kind}: USD`)
        for (const w of sample) {
          if (currencyFigureRegex(w.price).test(body))
            failures.push(`${url} ${kind}: ${w.price} beside a currency`)
        }
        await pause(150)
      }
    }
  } finally {
    await api.dispose()
  }
  expect(failures, failures.join('\n')).toEqual([])
})
