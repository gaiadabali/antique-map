/** 10.6.f clause 5 (data half): the shop lists 156 designs over every page, none a mock product; the retired mock slug shows no product. */
import { expect, request as newRequest, test } from '@playwright/test'

import { SHOP, pause } from './support'

const MOCK = /SEED-SHOP-|Mock seed|Produk seed/

test('/shop lists 156 distinct published designs over every page, none a mock', async () => {
  test.setTimeout(300_000)
  const api = await newRequest.newContext({ extraHTTPHeaders: { 'User-Agent': 'indies-qa-10.6f' } })
  try {
    const slugs = new Set<string>()
    let last = 1
    let stated = 0
    for (let page = 1; page <= last; page++) {
      const res = await api.get(`${SHOP}/shop${page === 1 ? '' : `?page=${page}`}`)
      expect(res.status(), `/shop page ${page}`).toBe(200)
      const html = await res.text()
      if (page === 1) {
        stated = Number(/([\d,]+) products/.exec(html)![1]!.replace(/,/g, ''))
        last = Math.max(...[...html.matchAll(/href="\/shop\?page=(\d+)"/g)].map((m) => Number(m[1])))
      }
      expect(html, `/shop page ${page} has no mock marker`).not.toMatch(MOCK)
      for (const m of html.matchAll(/<a href="\/product\/([^"]+)" class="browse-module__[^"]*card"/g))
        slugs.add(m[1]!)
      await pause(150)
    }
    console.log(`shop: stated ${stated}, ${slugs.size} distinct designs over ${last} pages`)
    expect(stated).toBe(156)
    expect(slugs.size).toBe(156)
  } finally {
    await api.dispose()
  }
})

test('the retired mock /product/greeting-card-set-frangipani shows no buyable product', async () => {
  const api = await newRequest.newContext()
  try {
    const res = await api.get(`${SHOP}/product/greeting-card-set-frangipani`)
    const html = await res.text()
    console.log(`greeting-card-set-frangipani: status ${res.status()}`)
    expect(html, 'no Add to bag').not.toContain('Add to bag')
    expect(html, 'no Product JSON-LD').not.toContain('"@type": "Product"')
    expect(html, 'no SEED-SHOP sku').not.toMatch(/SEED-SHOP-/)
    expect(html, 'no Rp price').not.toMatch(/Rp\s?\d/)
    expect([404, 200]).toContain(res.status())
  } finally {
    await api.dispose()
  }
})
