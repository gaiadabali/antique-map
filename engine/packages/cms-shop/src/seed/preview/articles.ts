/**
 * The client preview's articles step (`./index`): two published articles, each a PDF committed in
 * `./data` and a product's first picture as its cover, in both languages. An article whose slug
 * is already on record is left as it is, and its PDF is not uploaded again.
 *
 * The PDFs are read by a `new URL()` a bundler follows, so they ship with the release and the
 * admin's seed screen finds them on a server (as `../catalogue/data/design-images` does).
 */
import { readFileSync } from 'node:fs'

import { allOf, firstImageOf, writeOf, type Doc, type Step } from './shared'

type ArticleSeed = {
  readonly slug: string
  readonly en: string
  readonly id: string
  readonly date: string
  readonly coverOf: string
  readonly pdf: URL
}

export const PREVIEW_ARTICLES: readonly ArticleSeed[] = [
  {
    slug: 'mapping-bali-in-the-eighteenth-century',
    en: 'Mapping Bali in the Eighteenth Century',
    id: 'Memetakan Bali di Abad ke-18',
    date: '2026-11-10T00:00:00.000Z',
    coverOf: 'map-of-bali-island-1724',
    pdf: new URL('./data/mapping-bali-in-the-eighteenth-century.pdf', import.meta.url),
  },
  {
    slug: 'the-golden-age-of-travel-posters-to-java',
    en: 'The Golden Age of Travel Posters to Java',
    id: 'Masa Keemasan Poster Perjalanan ke Jawa',
    date: '2026-10-28T00:00:00.000Z',
    coverOf: 'fly-to-java-travel-poster-1938',
    pdf: new URL('./data/the-golden-age-of-travel-posters-to-java.pdf', import.meta.url),
  },
]

export type ArticlesReport = { created: number; present: number }

async function uploadPdf(step: Step, article: ArticleSeed): Promise<number> {
  const data = readFileSync(article.pdf)
  const media = (await step.payload.create({
    collection: 'media',
    ...writeOf(step),
    data: { title: article.en } as never,
    file: {
      data,
      name: `${article.slug}.pdf`,
      mimetype: 'application/pdf',
      size: data.length,
    },
  })) as unknown as Doc
  await step.payload.update({
    collection: 'media',
    id: media.id,
    ...writeOf(step, 'id'),
    data: { title: article.id } as never,
  })
  return media.id
}

export async function seedArticles(step: Step): Promise<ArticlesReport> {
  const report: ArticlesReport = { created: 0, present: 0 }
  for (const article of PREVIEW_ARTICLES) {
    const present = await allOf(step, 'articles', { slug: { equals: article.slug } })
    if (present.length > 0) {
      report.present += 1
      continue
    }
    const pdf = await uploadPdf(step, article)
    const cover = await firstImageOf(step, article.coverOf)
    const created = (await step.payload.create({
      collection: 'articles',
      ...writeOf(step),
      data: {
        title: article.en,
        slug: article.slug,
        date: article.date,
        pdf,
        ...(cover !== null ? { cover } : {}),
        _status: 'published',
      } as never,
    })) as unknown as Doc
    await step.payload.update({
      collection: 'articles',
      id: created.id,
      ...writeOf(step, 'id'),
      data: { title: article.id, _status: 'published' } as never,
    })
    report.created += 1
  }
  return report
}
