/**
 * The shop's articles (TASKS.md 28.2; the collection is 28.1's): each a PDF with a cover picture.
 * A public read — `overrideAccess: false`, published only, newest first — selecting the fields the
 * home's "Our latest articles" and the articles page show. The cover is the public derivative
 * (`../catalogue/images`), the PDF the one public route that serves a file (`/api/x/media/{id}`,
 * `../../media/public-file`), which answers only while a published article places it. An article
 * without its PDF is left out; one whose cover has no public picture yet shows its title instead. Cached under the shop's pages tag,
 * which an article's change expires.
 */
import 'server-only'

import { cacheLife } from 'next/cache'

import { cacheTags, pagesTag } from '@engine/cache'
import { cms } from '@engine/cms/instance'
import type { SiteLocale } from '@engine/config/sites'
import { PUBLIC_IMAGE_SELECT } from '@engine/site/media/public-image'

import { PUBLIC_FILE_SELECT, publicFileOf } from '../../media/public-file'
import { imageOf } from '../catalogue/images'
import type { CatalogueImage } from '../catalogue/view-models'
import type { PublicFile } from '../pages/blocks'

export type ArticleVM = {
  readonly slug: string
  readonly title: string
  readonly summary: string | null
  /** The article's date, `YYYY-MM-DD`. */
  readonly date: string | null
  /** The cover's public derivative; `null` until the media pipeline has made it. */
  readonly cover: CatalogueImage | null
  readonly pdf: PublicFile
}

type ArticleDoc = {
  slug?: unknown
  title?: unknown
  summary?: unknown
  date?: unknown
  cover?: unknown
  pdf?: unknown
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null

/** One projected doc as the page shows it, or `null` when it lacks what it needs. */
export function articleOf(doc: ArticleDoc): ArticleVM | null {
  const slug = text(doc.slug)
  const title = text(doc.title)
  const cover = imageOf(doc.cover)
  const pdf = publicFileOf(doc.pdf, 'pdf')
  if (slug === null || title === null || pdf === null) return null
  const date = text(doc.date)
  return {
    slug,
    title,
    summary: text(doc.summary),
    date: date ? date.slice(0, 10) : null,
    cover,
    pdf,
  }
}

/** The published articles, newest first; `limit` the newest few (the home's two). */
export async function publishedArticles(
  locale: SiteLocale,
  limit = 100,
): Promise<readonly ArticleVM[]> {
  'use cache'
  cacheLife('hours')
  cacheTags([pagesTag('shop')])
  const payload = await cms()
  const { docs } = await payload.find({
    collection: 'articles',
    overrideAccess: false,
    locale,
    fallbackLocale: 'en',
    where: { _status: { equals: 'published' } },
    sort: '-date',
    select: {
      title: true,
      summary: true,
      date: true,
      slug: true,
      cover: true,
      pdf: true,
    },
    // The cover's public derivative and the PDF's type, size and title — nothing else of media.
    populate: { media: { ...PUBLIC_IMAGE_SELECT, provenance: true, ...PUBLIC_FILE_SELECT } },
    limit,
    depth: 1,
  } as never)
  return (docs as unknown as readonly ArticleDoc[]).flatMap((doc) => articleOf(doc) ?? [])
}
