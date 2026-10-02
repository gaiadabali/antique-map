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
  readonly path: string
  readonly title: string
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

function absoluteUrl(origin: string, locale: 'en' | 'id', path: string): string {
  const prefix = locale === 'en' ? '' : '/id'
  const normalized = path === '/' ? '/' : path
  return `${origin}${prefix}${normalized}`
}

export function pageMetadata(input: PageMetadataInput): Metadata {
  const { site, locale, path, title, description, image, noindex, origin } = input
  const canonical = absoluteUrl(origin, locale, path)
  const xDefault = absoluteUrl(origin, 'en', path)
  const languages: Record<string, string> = {
    en: absoluteUrl(origin, 'en', path),
    id: absoluteUrl(origin, 'id', path),
    'x-default': xDefault,
  }

  return {
    title,
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
      images: image ? [image] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image.url] : undefined,
    },
    robots: noindex ? { index: false, follow: false } : undefined,
  }
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
