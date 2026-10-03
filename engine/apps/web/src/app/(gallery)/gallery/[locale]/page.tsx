/**
 * The gallery's home (ticket 4.3.b), from the design team's drawing: the composition lives in
 * `sites/gallery/home`; this page hands it the locale, the gallery's `href()` and the lexicon's
 * words. The gallery never names a price; its featured works are streamed below the fold.
 */
import type { Metadata } from 'next'
import { connection } from 'next/server'

import type { SiteLocale } from '@engine/config/sites'

import { siteHref } from '../../../../shell/site'
import { homeMetadata } from '../../../../shell/site-root'
import { GalleryHome } from '../../../../sites/gallery/home/gallery-home'
import { homeText } from '../../../../sites/gallery/home/home-messages'

export function generateMetadata({ params }: PageProps<'/gallery/[locale]'>): Promise<Metadata> {
  return homeMetadata('gallery', params)
}

export default async function GalleryHomePage({ params }: PageProps<'/gallery/[locale]'>) {
  // Dynamic at request time: the home's cached loaders read the CMS, never at build — and the
  // layout's own `connection()` does not hold this page back (shell/site.ts).
  await connection()
  const { locale } = await params
  const href = siteHref('gallery')
  return (
    <GalleryHome
      locale={locale as 'en' | 'id'}
      href={(surface, linkParams, linkLocale) =>
        href(surface, linkParams, linkLocale as SiteLocale)
      }
      t={homeText(locale as SiteLocale)}
    />
  )
}
