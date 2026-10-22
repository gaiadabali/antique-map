/**
 * The `pages` collection's reads for the gallery (5.4.b): `overrideAccess: false`,
 * `_status: 'published'`, `site: 'gallery'`, an explicit `select`.
 *
 * `kind` tells apart the two public surfaces that share this collection: the generic page surface
 * (`/{slug}`, `about`, `guarantee`, `certificate`, `condition`, `shipping`, `visit`…) reads
 * `kind: 'page'`; `/stories/{slug}` reads `kind: 'story'` — so a story's slug never resolves at the
 * plain path and a page's never resolves under `/stories/`, each one address only.
 *
 * Kept free of `'use cache'` and of `'server-only'` — see `../makers/queries.ts`'s note: no
 * cache-tag kind exists yet for a `pages` record, and pure functions over a given `Payload` let a
 * database test call them with a pushed test stack's own instance.
 */
import type { SiteLocale } from '@engine/config/sites'
import type { Payload } from 'payload'

import { PUBLIC_IMAGE_SELECT } from '../../media/public-image'
import { cardImageOf, projectCards } from '../catalogue/projection'
import type { PageVM } from './view-models'

const UNKNOWN_DATE: Record<SiteLocale, string> = {
  en: 'Date unknown',
  id: 'Tanggal tidak diketahui',
}

const str = (value: unknown): string => (typeof value === 'string' ? value : '')

/** The body's paragraphs: blank lines split it, each trimmed, empties dropped. */
function paragraphsOf(value: unknown): readonly string[] {
  if (typeof value !== 'string') return []
  return value
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p !== '')
}

function workIdsOf(value: unknown): readonly number[] {
  if (!Array.isArray(value)) return []
  return value
    .map((row) => (typeof row === 'number' ? row : (row as { id?: unknown })?.id))
    .filter((id): id is number => typeof id === 'number' && Number.isSafeInteger(id))
}

/** One page's data by its slug and kind, or `null` — no published gallery page matches. */
export async function loadPageWith(
  payload: Payload,
  slug: string,
  locale: SiteLocale,
  kind: 'page' | 'story' = 'page',
): Promise<PageVM | null> {
  const found = await payload.find({
    collection: 'pages',
    overrideAccess: false,
    where: {
      and: [
        { _status: { equals: 'published' } },
        { site: { equals: 'gallery' } },
        { kind: { equals: kind } },
        { slug: { equals: slug } },
      ],
    },
    select: {
      title: true,
      intro: true,
      // The public derivative and its ladder, as a work card's (never the staff-only file route).
      hero: PUBLIC_IMAGE_SELECT,
      body: true,
      works: true,
      seo: { title: true, description: true },
    },
    depth: 1,
    limit: 1,
    locale,
  })
  const doc = found.docs[0] as Record<string, unknown> | undefined
  if (!doc) return null
  const works = await projectCards(payload, workIdsOf(doc.works), locale, UNKNOWN_DATE[locale])
  const seo = (doc.seo as Record<string, unknown> | undefined) ?? {}
  return {
    title: str(doc.title),
    intro: str(doc.intro) || null,
    hero: cardImageOf(doc.hero),
    body: paragraphsOf(doc.body),
    works,
    seoTitle: str(seo.title) || null,
    seoDescription: str(seo.description) || null,
  }
}
