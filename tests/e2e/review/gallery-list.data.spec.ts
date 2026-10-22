/**
 * 10.6.f clause 1: the gallery lists every published record. The default browse lists available works
 * only; `?availability=sold` is the site's "Include sold" option (available + sold). Every page is read
 * (24 cards a page, one at a time) and the distinct item links counted against the stated count and the
 * database's 1,513 available / 1,709 published (196 sold).
 */
import { expect, request as newRequest, test } from '@playwright/test'

import { GALLERY, pause, readSample } from './support'

const AVAILABLE = 1513
const PUBLISHED = 1709
const SOLD = 196

async function crawl(path: string) {
  const api = await newRequest.newContext({ extraHTTPHeaders: { 'User-Agent': 'indies-qa-10.6f' } })
  try {
    const ids = new Set<string>()
    let stated = 0
    let pages = 0
    let lastPage = 1
    for (let page = 1; page <= lastPage; page++) {
      const sep = path.includes('?') ? '&' : '?'
      const res = await api.get(`${GALLERY}${path}${page === 1 ? '' : `${sep}page=${page}`}`)
      expect(res.status(), `${path} page ${page}`).toBe(200)
      const html = await res.text()
      pages += 1
      if (page === 1) {
        stated = Number(/([\d,]+) works/.exec(html)![1]!.replace(/,/g, ''))
        const numbers = [...html.matchAll(/href="[^"]*(?:\?|&amp;|&)page=(\d+)"/g)].map((m) =>
          Number(m[1]),
        )
        lastPage = Math.max(...numbers)
      }
      for (const m of html.matchAll(/href="\/product\/(\d+)[^"]*"/g)) ids.add(m[1]!)
      await pause(150)
    }
    return { ids, stated, pages, lastPage }
  } finally {
    await api.dispose()
  }
}

test.describe.configure({ mode: 'serial' })

let availableIds = new Set<string>()
let allIds = new Set<string>()

test('default browse: states 1,513 works and lists 1,513 distinct items over every page', async () => {
  test.setTimeout(600_000)
  const r = await crawl('/browse')
  console.log(
    `available: stated ${r.stated}, ${r.ids.size} distinct items over ${r.pages} pages (last page ${r.lastPage})`,
  )
  availableIds = r.ids
  expect(r.stated).toBe(AVAILABLE)
  expect(r.pages).toBe(r.lastPage)
  expect(r.ids.size).toBe(AVAILABLE)
})

test('with sold included: states 1,709 works and lists 1,709 distinct items over every page', async () => {
  test.setTimeout(600_000)
  const r = await crawl('/browse?availability=sold')
  console.log(
    `incl. sold: stated ${r.stated}, ${r.ids.size} distinct items over ${r.pages} pages (last page ${r.lastPage})`,
  )
  allIds = r.ids
  expect(r.stated).toBe(PUBLISHED)
  expect(r.ids.size).toBe(PUBLISHED)
})

test('available is a subset; the difference is exactly the 196 sold; the sample works are all on the default browse', () => {
  expect(allIds.size - availableIds.size).toBe(SOLD)
  expect([...availableIds].filter((id) => !allIds.has(id))).toEqual([])
  const sample = readSample()
  // The sample's works are all available (its status column), so all are on the default browse.
  expect(
    sample.filter((w) => !availableIds.has(String(w.publicId))).map((w) => w.publicId),
  ).toEqual([])
})

test('a sold work from the sold-included list opens and says Sold; an available one opens with its ask panel', async () => {
  const sold = [...allIds].find((id) => !availableIds.has(id))!
  const available = [...availableIds][0]!
  const api = await newRequest.newContext({ extraHTTPHeaders: { 'User-Agent': 'indies-qa-10.6f' } })
  try {
    const s = await api.get(`${GALLERY}/product/${sold}`)
    expect(s.status(), `sold item ${sold}`).toBe(200)
    const sHtml = await s.text()
    expect(sHtml, `sold item ${sold} panel`).toContain('data-status="sold"')
    const a = await api.get(`${GALLERY}/product/${available}`)
    expect(a.status(), `available item ${available}`).toBe(200)
    expect(await a.text(), `available item ${available} panel`).toContain('data-status="available"')
    console.log(`opened sold ${sold} and available ${available}`)
  } finally {
    await api.dispose()
  }
})
