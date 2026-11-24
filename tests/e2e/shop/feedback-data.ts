/**
 * The owner's data for `./feedback-suite`'s checks (TASKS.md 28.2), made through Payload's REST
 * API as the owner: the contact, the promise and the pop-up switched on, two articles (a product's
 * picture as the cover, a one-page PDF), a theme and a best seller, a Wall Decor category, two
 * flagship stores and four in Ubud. Split from the suite to keep each file under 300 lines.
 */
import { expect, type APIRequestContext, type Page } from '@playwright/test'

import { staffApi } from '../shop-app/support'

type Json = Record<string, unknown>

export const CONTACT = {
  phone: '+62 361 000 111',
  whatsapp: '+6281200001111',
  email: 'hello-e2e@example.test',
}
/** The newsletter pop-up's "seen" key in the browser's storage (`newsletter/state.ts`). */
export const SEEN = 'oei:newsletter-seen'

/** A one-page PDF, as small as a valid one gets. */
function pdfBytes(): Buffer {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>',
  ]
  let body = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((object, index) => {
    offsets.push(body.length)
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = body.length
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) body += `${String(offset).padStart(10, '0')} 00000 n \n`
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(body, 'latin1')
}

async function json(answer: Awaited<ReturnType<APIRequestContext['get']>>, what: string) {
  expect(answer.status(), `${what}: ${await answer.text()}`).toBeLessThan(300)
  return (await answer.json()) as Json
}

const docsOf = async (api: APIRequestContext, path: string) =>
  ((await json(await api.get(path), path)).docs as Json[]) ?? []

/** Finds a record by a field, or makes it. */
async function upsert(api: APIRequestContext, collection: string, where: string, data: Json) {
  const [found] = await docsOf(api, `/api/${collection}?depth=0&limit=1&draft=true&${where}`)
  const answer = found
    ? await api.patch(`/api/${collection}/${String(found.id)}?locale=en`, { data })
    : await api.post(`/api/${collection}?locale=en`, { data })
  return (await json(answer, `${collection} saved`)).doc as Json
}

export type FeedbackData = { readonly theme: string; readonly product: string }

/** The owner's data for the feedback's sections, made (or found) through the REST API. */
export async function makeFeedbackData(): Promise<FeedbackData> {
  const api = await staffApi('owner')
  try {
    await json(
      await api.post('/api/globals/site-settings?locale=en', {
        data: {
          shop: { contact: CONTACT, promo: { enabled: true }, newsletter: { enabled: true } },
        },
      }),
      'the settings',
    )
    // A published product with a picture: the best seller, in the theme, its category Wall Decor.
    const products = await docsOf(
      api,
      '/api/products?depth=1&limit=20&where[_status][equals]=published&sort=id',
    )
    const product = products.find((each) => {
      const image = (each.images as { image?: Json }[] | undefined)?.[0]?.image
      return typeof image === 'object' && image !== null && each.category
    })
    expect(product, 'a published product with a picture and a category').toBeTruthy()
    const cover = ((product!.images as { image: Json }[])[0]!.image as Json).id
    const category = (product!.category as Json).id ?? product!.category
    const theme = await upsert(api, 'themes', 'where[slug][equals]=e2e-bali', {
      label: 'E2E Bali',
      slug: 'e2e-bali',
      _status: 'published',
    })
    await json(
      await api.patch(`/api/products/${String(product!.id)}`, {
        data: { bestSeller: true, themes: [theme.id], _status: 'published' },
      }),
      'the best seller',
    )
    await json(
      await api.patch(`/api/categories/${String(category)}`, {
        data: { wallDecor: true, _status: 'published' },
      }),
      'the wall decor category',
    )
    // The PDF, then two articles.
    const [pdf] = await docsOf(api, '/api/media?depth=0&limit=1&where[title][equals]=E2E article')
    const pdfId =
      pdf?.id ??
      (
        (
          await json(
            await api.post('/api/media', {
              multipart: {
                file: { name: 'e2e-article.pdf', mimeType: 'application/pdf', buffer: pdfBytes() },
                _payload: JSON.stringify({ title: 'E2E article', alt: '', subject: 'other' }),
              },
            }),
            'the PDF',
          )
        ).doc as Json
      ).id
    for (const [slug, title, date] of [
      ['e2e-article-one', 'E2E article one', '2026-11-01'],
      ['e2e-article-two', 'E2E article two', '2026-11-10'],
    ] as const) {
      await upsert(api, 'articles', `where[slug][equals]=${slug}`, {
        title,
        slug,
        summary: `${title}, a short summary.`,
        cover,
        pdf: pdfId,
        date,
        _status: 'published',
      })
    }
    // Two flagships, four stores in Ubud (one more than a region shows before "See all").
    const stores = await docsOf(
      api,
      '/api/stores?depth=0&limit=6&sort=id&where[active][equals]=true&where[listed][equals]=true',
    )
    expect(stores.length, 'six listed stores').toBeGreaterThanOrEqual(6)
    for (const [index, store] of stores.entries()) {
      const data = index < 2 ? { flagship: true } : { flagship: false, region: 'ubud' }
      await json(await api.patch(`/api/stores/${String(store.id)}`, { data }), 'a store')
    }
    return { theme: 'E2E Bali', product: String(product!.name) }
  } finally {
    await api.dispose()
  }
}

/** A page with the newsletter pop-up already seen: it never opens over the checks. */
export async function quiet(page: Page): Promise<void> {
  await page.addInitScript((key) => window.localStorage.setItem(key, 'e2e'), SEEN)
}
