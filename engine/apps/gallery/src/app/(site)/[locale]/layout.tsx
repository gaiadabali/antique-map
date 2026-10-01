/**
 * The storefront's root layout (ARCHITECTURE.md §9). It awaits `connection()` (in `currentBrand()`)
 * before anything else, so nothing under it prerenders at `next build`: a prerendered shell would need the
 * database at build or bake a brand-less masthead into every brand's HTML. The brand is read here,
 * per request, from `BRAND` — one build serves each brand its own masthead. Icons and the web
 * manifest are linked through `generateMetadata()` from `ShellVM.assets` (C2 v1.3: `favicon`,
 * `touchIcon`, `manifest`, none linked for a file the brand does not ship), never Next's file
 * conventions (`app/icon.*`, `app/manifest.ts`), which one build would bake in for every brand
 * (C13 `ROOT_REWRITES`).
 *
 * `instant = false` is the one segment config the storefront carries, and only here (the 4.1.e
 * spike, ARCHITECTURE.md §9): Cache Components refuses a `connection()` outside `<Suspense>` at
 * build unless the route may block, and a `<Suspense>` around the page would flush a 200 and a
 * fallback before the page could answer 404 or 308, and hide its body and forms from a visitor
 * without JavaScript (C13 `FORM_RESULT`). Blocking here is the design: the page renders per
 * request, each read is cached by tag, and only the parts inside a page's own `<Suspense>` stream.
 */
import '../../../styles/tokens.css'
import '../../../styles/site.css'

import { LOCALE_CODES } from '@engine/config/constants'
import { isSupportedLocale } from '@engine/i18n'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { currentBrand } from '../../../shell/brand'
import { loadShell } from '../../../shell/load-shell'
import { shellMessages } from '../../../shell/messages'
import { SiteShell } from '../../../shell/site-shell'

export const instant = false

/**
 * `[locale]` is a root parameter, which Cache Components requires a build to list: every locale the
 * engine knows (brand-independent, so one build serves any brand). Listing prerenders nothing — the
 * layout awaits `connection()` — and the brand's own subset is checked per request.
 */
export function generateStaticParams(): { locale: string }[] {
  return LOCALE_CODES.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params
  if (!isSupportedLocale((await currentBrand()).config, locale)) return {}
  const shell = await loadShell(locale)
  const { touchIcon = null, manifest = null } = shell.assets
  return {
    title: { default: shell.brand.name, template: `%s · ${shell.brand.name}` },
    metadataBase: new URL(shell.brand.origin),
    icons: { icon: shell.assets.favicon, ...(touchIcon === null ? {} : { apple: touchIcon }) },
    ...(manifest === null ? {} : { manifest }),
  }
}

export default async function SiteLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params
  if (!isSupportedLocale((await currentBrand()).config, locale)) notFound()
  const shell = await loadShell(locale)
  const { t } = await shellMessages(locale)
  return (
    <html lang={locale}>
      <body>
        <SiteShell shell={shell} t={t}>
          {children}
        </SiteShell>
      </body>
    </html>
  )
}
