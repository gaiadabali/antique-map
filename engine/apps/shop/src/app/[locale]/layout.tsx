/**
 * The shop's root layout (TASKS.md 23.2): the proxy rewrites every public page of the shop's hosts
 * here, as `/<locale>/…`, which no public URL reaches directly. Everything is the shell's
 * (`../../shell/root`, the shop's shell from `@engine/storefront`); the pages are the storefront's.
 *
 * `instant = false`, as today's site roots: the layout awaits `connection()`, so the route renders
 * per request and may block, rather than flush a 200 and a fallback before a page answers 404.
 */
import { SITE_LOCALES } from '@engine/config/sites'
import type { Metadata } from 'next'

// The home's bridge to the originals (`@engine/storefront/originals`): the gallery client's reader
// (TASKS.md 23.5.c), registered here — the module every shop page loads before it renders.
import '../../originals/register'
import { ShopRoot, shopMetadata } from '../../shell/root'

export const instant = false

/** `[locale]` is a root parameter, which Cache Components requires a build to list. */
export function generateStaticParams(): { locale: string }[] {
  return SITE_LOCALES.map((locale) => ({ locale }))
}

export function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  return shopMetadata(params)
}

export default function ShopLayout({ children, params }: LayoutProps<'/[locale]'>) {
  return <ShopRoot params={params}>{children}</ShopRoot>
}
