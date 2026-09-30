/**
 * The shell's view model (C2 `ShellVM`) until `@engine/loaders` builds it (TASKS.md 11.3): the
 * fixture for everything the CMS will own — navigation, sellers, the streamed ship-to, cart and
 * consent parts — with the brand's identity laid over it from config at request time: its name,
 * storefront, origin, locales, modules, contact and analytics ids, and every brand-asset URL at its
 * versioned address (C13 `BRAND_ASSET_URL`), minted here and never in a template. So one build
 * renders each brand's own masthead (ARCHITECTURE.md §9).
 */
import { hasModule, MODULE_KEYS, type BrandConfig, type LocaleCode } from '@engine/config/schema'
import { brandAssetUrl, versionedBrandAssetUrl } from '@engine/http/brand-assets'
import { BRAND_ASSET_URL, ROOT_REWRITES } from '@engine/http/manifest'
import type { ShellVM } from '@engine/view-models'
import { SHELL_FIXTURES } from '@engine/view-models/fixtures'

import { currentBrand } from './brand'

/** The origin this process serves (`SITE_URL`), else the brand's staging host. */
export function siteOrigin(config: Pick<BrandConfig, 'domains'>): string {
  const raw = process.env.SITE_URL?.trim()
  if (raw) {
    try {
      return new URL(raw).origin
    } catch {
      // the boot check refuses a malformed SITE_URL; fall through to the brand's own host
    }
  }
  const host = config.domains.production ?? config.domains.staging
  return host ? `https://${host}` : 'http://localhost'
}

export async function loadShell(locale: LocaleCode): Promise<ShellVM> {
  const { config, paths } = await currentBrand()
  const fixture =
    config.storefront === 'gallery' ? SHELL_FIXTURES.shell : SHELL_FIXTURES['shell-shop']
  const asset = (path: string) => brandAssetUrl(paths.assetsDir, path)
  return {
    ...fixture,
    brand: { name: config.name, storefront: config.storefront, origin: siteOrigin(config) },
    locale,
    defaultLocale: config.locales.default,
    locales: config.locales.supported,
    assets: {
      logo: asset(config.assets.logo),
      mark: config.assets.mark === null ? null : asset(config.assets.mark),
      favicon: asset(config.assets.favicon),
      ogImage: asset(config.assets.ogImage),
      fonts: config.assets.fonts.map((font) => ({ ...font, src: asset(font.src) })),
    },
    // Brand overrides reach the page only through the contrast gate (C3, TASKS.md 11.2); until
    // it exists the app's placeholder tokens render for every brand.
    tokens: {},
    modules: MODULE_KEYS.filter((key) => hasModule(config, key)),
    contact: {
      email: config.identity.contact.email,
      whatsapp: null,
      phone: config.identity.contact.phone,
    },
    analytics: config.analytics,
  }
}

/**
 * The brand file a root URL is answered from (C13 `ROOT_REWRITES`: `/apple-touch-icon.png` →
 * `/brand-assets/apple-touch-icon.png`), so the names live in the contract, not here.
 */
function rootFileAsset(from: (typeof ROOT_REWRITES)[number]['from']): string {
  const row = ROOT_REWRITES.find((each) => each.from === from)
  if (!row?.to.startsWith(BRAND_ASSET_URL.path)) throw new Error(`no brand file answers ${from}`)
  return row.to.slice(BRAND_ASSET_URL.path.length)
}

/**
 * The touch icon and the web manifest, at their versioned URLs, for `generateMetadata()` — a page
 * links them through its metadata, never Next's file conventions, which are one build's (C13
 * `ROOT_REWRITES`). `null` for a file the brand has not shipped: no link to a 404. (C2 `ShellVM`
 * is to carry both — `assets.touchIcon`, `assets.manifest` — proposed to ARC in 4.1.)
 */
export async function brandIcons(): Promise<{ touchIcon: string | null; manifest: string | null }> {
  const { paths } = await currentBrand()
  return {
    touchIcon: versionedBrandAssetUrl(paths.assetsDir, rootFileAsset('/apple-touch-icon.png')),
    manifest: versionedBrandAssetUrl(paths.assetsDir, rootFileAsset('/site.webmanifest')),
  }
}
