/**
 * Pure Next.js `Metadata` builders for both sites.
 *
 * Every absolute URL is built from the `origin` argument — never from a request header — so the
 * helpers can run in unit tests and at build time without trusting a host.
 */
import type { SiteKey } from '@engine/config/sites'
import type { Metadata } from 'next'

export type PageMetadataInput = {
  readonly site: SiteKey
  readonly locale: 'en' | 'id'
  /**
   * This page's own root-relative path in every locale the site serves — each one already in its
   * own translated segment and already carrying its own `/id` prefix (an `href()` call per
   * locale), never one path reused across locales: a site's Indonesian segment is its own word
   * (`/browse` · `/jelajah`), not the English one behind `/id` (the bug the 5.2 review found).
   */
  readonly paths: Readonly<Record<'en' | 'id', string>>
  readonly title: string
  /** The title as written, without the layout's ` · Site` template (a home page names the site). */
  readonly absoluteTitle?: boolean
  readonly description: string
  readonly image?: {
    readonly url: string
    readonly alt: string
    readonly width?: number
    readonly height?: number
  }
  readonly noindex?: boolean
  readonly origin: string
}

const SITE_NAMES: Record<SiteKey, string> = {
  gallery: 'Indies Gallery',
  shop: 'Old East Indies',
}

const LOCALE_OG: Record<'en' | 'id', string> = {
  en: 'en_GB',
  id: 'id_ID',
}

/**
 * The picture a page shares when it has none of its own: the site's Open Graph card
 * (`public/<site>/og.png`, 1200 × 630). A page's `openGraph` replaces the layout's whole object,
 * so without this every page that names no picture would share none.
 */
export function siteOgImage(site: SiteKey): NonNullable<PageMetadataInput['image']> {
  return { url: `/${site}/og.png`, alt: SITE_NAMES[site], width: 1200, height: 630 }
}

export function pageMetadata(input: PageMetadataInput): Metadata {
  const { site, locale, paths, title, absoluteTitle, description, noindex, origin } = input
  const image = input.image ?? siteOgImage(site)
  const at = (l: 'en' | 'id') => `${origin}${paths[l]}`
  const canonical = at(locale)
  const xDefault = at('en')
  const languages: Record<string, string> = { en: at('en'), id: at('id'), 'x-default': xDefault }

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    metadataBase: new URL(origin),
    alternates: { canonical, languages },
    openGraph: {
      type: 'website',
      siteName: SITE_NAMES[site],
      locale: LOCALE_OG[locale],
      title,
      description,
      url: canonical,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.url],
    },
    robots: noindex ? { index: false, follow: false } : undefined,
  }
}

const MAX_DESCRIPTION_LENGTH = 155

/** A meta description never runs past ~155 chars (never mid-word): the record's own text, cut at
 * the last space before the limit, an ellipsis marking the cut. Already-short text is untouched. */
export function trimDescription(text: string, max = MAX_DESCRIPTION_LENGTH): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  const cut = trimmed.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

export function workTitle(title: string, maker?: string, year?: string | number): string {
  const parts = [title]
  if (maker || year !== undefined) {
    const byline = [maker, year !== undefined ? String(year) : undefined].filter(Boolean).join(', ')
    parts.push(`– ${byline}`)
  }
  parts.push('| Indies Gallery')
  return parts.join(' ')
}

/** A page's own picture as `pageMetadata` shares it; `undefined` (the site's card) without one. */
export function shareImageOf(
  image:
    | {
        readonly url: string
        readonly alt: string
        readonly width: number | null
        readonly height: number | null
      }
    | null
    | undefined,
): PageMetadataInput['image'] {
  if (!image) return undefined
  return {
    url: image.url,
    alt: image.alt,
    ...(image.width ? { width: image.width } : {}),
    ...(image.height ? { height: image.height } : {}),
  }
}
