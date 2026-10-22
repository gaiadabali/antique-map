/**
 * The gallery's root layout (ARCHITECTURE.md §6). The proxy rewrites every public page of the gallery's
 * hosts here, under the internal prefix `/gallery/`, which no public URL reaches directly. It reads
 * the site at request time, `connection()` first (`../../../../shell/site`), so nothing under it
 * prerenders at `next build`.
 *
 * `instant = false` is the one segment config a site carries, and only on its root layout (the
 * Cache Components spike): Cache Components refuses a `connection()` outside `<Suspense>` at build
 * unless the route may block, and a `<Suspense>` around the page would flush a 200 and a fallback
 * before the page could answer 404 or 308, and hide its body and forms from a visitor without
 * JavaScript. Blocking here is the design: the page renders per request, each read is cached by
 * tag, and only the parts inside a page's own `<Suspense>` stream.
 */
import '../../../../styles/tokens.css'
import '../../../../styles/site.css'

import { SITE_LOCALES } from '@engine/config/sites'
import type { Metadata } from 'next'

import { SiteRoot, siteMetadata } from '../../../../shell/site-root'

export const instant = false

/**
 * `[locale]` is a root parameter, which Cache Components requires a build to list: the locales
 * every site serves. Listing prerenders nothing — the layout awaits `connection()`.
 */
export function generateStaticParams(): { locale: string }[] {
  return SITE_LOCALES.map((locale) => ({ locale }))
}

export function generateMetadata({ params }: LayoutProps<'/gallery/[locale]'>): Promise<Metadata> {
  return siteMetadata('gallery', params)
}

export default function GalleryLayout({ children, params }: LayoutProps<'/gallery/[locale]'>) {
  return (
    <SiteRoot site="gallery" params={params}>
      {children}
    </SiteRoot>
  )
}
