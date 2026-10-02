/**
 * The shell's view model (C2 `ShellVM`) until `@engine/loaders` builds it (TASKS.md 11.3): the
 * fixture for everything the CMS will own — navigation, sellers, the streamed ship-to, cart and
 * consent parts — with the brand's identity laid over it from config at request time: its name,
 * storefront, origin, locales, modules, contact and analytics ids, and every brand-asset URL at its
 * versioned address (C13 `BRAND_ASSET_URL`), minted here and never in a template. So one build
 * renders each brand's own masthead (ARCHITECTURE.md §9). The home-screen icon and the web manifest
 * are the files C13 `BRAND_ROOT_ASSETS` names — the ones the root URLs answer from — each `null`
 * when the brand ships none, so no page links a 404 (C2 v1.3 `ShellVM.assets`, TASKS.md 4.6.e).
 */
import { hasModule, MODULE_KEYS, type BrandConfig, type LocaleCode } from '@engine/config/schema'
import { brandAssetUrl, versionedBrandAssetUrl } from '@engine/http/brand-assets'
import { BRAND_ROOT_ASSETS } from '@engine/http/manifest'
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
      touchIcon: versionedBrandAssetUrl(paths.assetsDir, BRAND_ROOT_ASSETS.touchIcon),
      manifest: versionedBrandAssetUrl(paths.assetsDir, BRAND_ROOT_ASSETS.manifest),
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
