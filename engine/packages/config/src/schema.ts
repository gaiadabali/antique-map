/**
 * @contract C1 — the brand config schema and module registry · owner: ARC · consumers: every lane
 *
 * The entry of `@engine/config/schema`: the shape of `<brand>/site/brand.config.json`
 * (BRANDS.md §3), composed from `./schema/*` — primitives (the money base C5 builds on),
 * locales, the catalogue and listing vocabularies, money and markets, sellers, commerce,
 * modules, the look and identity — and the route map (C10, `./routes`). A difference
 * between brands is a field here, a module flag or a property of the data — never a branch
 * on a brand (CONVENTIONS.md §1). Structural settings need a deploy; editorial ones are
 * floors that CMS globals override. The locale and currency lists are also at the zod-free
 * `@engine/config/constants` (`./constants`), which a browser bundle imports instead.
 *
 * Rules needing the app or the whole config are `validateBrandConfigs()`'s (PLT, TASKS.md
 * 3.1), each failing CI with the field it names:
 * - modules ⊆ the app's `supports` (`AppSupports`);
 * - a segment map and default-locale text for every supported locale, the map holding a
 *   segment for every surface and form kind whose module is on (and none needed otherwise);
 * - `--font-display` declared in `assets.fonts`;
 * - market destinations disjoint, at most one market with `*`, sellers covering every market;
 * - the rupiah rule (COMMERCE.md §3, COMPLIANCE.md §1): when a seller serves `ID` or `*`, a
 *   market lists `ID` explicitly and is priced in IDR, and a seller serving `ID` lists IDR in
 *   `charge`;
 * - a price ladder for every market currency whose prices are derived, each band's `step` at
 *   most a tenth of its lower bound (the previous band's `upTo`; the first band's, of its own),
 *   and an `fx.bufferPct` for each (`"0"` when none — never a silent 0 %);
 * - `holdNoticeHours` < `holdDefaultHours` ≤ `holdMaxHours`, and `checkoutLockMinutes` within
 *   `checkoutLockMaxHours`;
 * - `documentPrefix` unique across sellers, and no provider listed twice in one seller;
 * - a seller's own couriers (`sellers[].shipping`) each one of the brand's `shipping.providers`;
 * - `sister.links` only with a sister in `sisters` to link and sync with;
 * - `retention.wishlist` only with `accounts.buyers` (its saved items are a buyer's account's),
 *   and never beside `retention.deviceWishlist` (a guest's, on the device — D35);
 * - `retention.wantList` only with `accounts.buyers` (its lists are a buyer account's) and with
 *   `retention.emailWantList`, whose want-list page is where every list is made (D39);
 * - `accounts.retailers` only with `commerce.trade` set, since approval assigns its
 *   `defaultTier` (the schema itself checks the tiers: ids unique, `defaultTier` one of them,
 *   none past `maxDiscountBps`);
 * - an `amount` minimum in `commerce.trade` in a currency every seller lists in `charge`: the
 *   seller that quotes a retailer is the one serving its destination, which may be any of them.
 * Secrets and environment are `bootCheck()`'s: every configured provider's — per seller for
 * payments and for each seller's own couriers, per brand for fulfilment — and the sister's when
 * one is set.
 *
 * `@engine/config` imports no other engine package: config ← domain ← view-models.
 */
import { z } from 'zod'

import { routeMapSchema } from './routes'
import {
  commerceConfigSchema,
  fulfilmentConfigSchema,
  shippingConfigSchema,
} from './schema/commerce'
import { domainsSchema, identitySchema, sisterSchema } from './schema/identity'
import { localeCodeSchema } from './schema/locales'
import { assetsSchema, STOREFRONTS, tokenOverridesSchema } from './schema/look'
import { moneyConfigSchema } from './schema/money'
import { modulesSchema } from './schema/modules'
import { idSchema } from './schema/primitives'
import { sellerSchema, type SellerConfig } from './schema/sellers'

export * from './schema/accounts'
export * from './schema/catalogue'
export * from './schema/commerce'
export * from './schema/facets'
export * from './schema/identity'
export * from './schema/locales'
export * from './schema/look'
export * from './schema/money'
export * from './schema/modules'
export * from './schema/primitives'
export * from './schema/sellers'
export * from './schema/trade'

export const brandConfigSchema = z
  .strictObject({
    /** An editor's JSON-schema pointer; ignored. */
    $schema: z.string().optional(),
    /** A scaffolded or placeholder config (`brand:create`): `bootCheck()` refuses it in production. */
    draft: z.boolean().default(false),
    slug: idSchema,
    name: z.string().min(1),
    domains: domainsSchema,
    storefront: z.enum(STOREFRONTS),
    identity: identitySchema,
    assets: assetsSchema,
    tokens: tokenOverridesSchema.default({}),
    /** Public deep-zoom tiles stop at this long edge; the full pyramid stays private (C9). */
    media: z
      .strictObject({ publicZoomMaxPx: z.int().min(1024).max(32768).default(4096) })
      .prefault({}),
    /** The default is served unprefixed; the database always holds en, id and nl. */
    locales: z.strictObject({
      default: localeCodeSchema,
      supported: z.array(localeCodeSchema).min(1),
    }),
    routes: routeMapSchema,
    ids: z.strictObject({
      /** Works get `<prefix>-000123`, the id sister sync and redirects key on. */
      workUidPrefix: z.string().regex(/^[A-Z][A-Z0-9]{1,7}$/, '2–8 upper-case letters or digits'),
      /** Validates `works.stockNumber` on save; `null` accepts any. */
      stockNumberPattern: z.string().refine(isRegExp, 'a valid regular expression').nullable(),
    }),
    money: moneyConfigSchema,
    sellers: z.array(sellerSchema).min(1),
    commerce: commerceConfigSchema,
    shipping: shippingConfigSchema,
    fulfilment: fulfilmentConfigSchema,
    /** Runtime values for `ShellVM` and the per-request CSP — never NEXT_PUBLIC_* (ARCHITECTURE.md §13). */
    analytics: z.strictObject({
      ga4Id: z
        .string()
        .regex(/^G-[A-Z0-9]+$/)
        .nullable(),
      metaPixelId: z
        .string()
        .regex(/^\d{5,20}$/)
        .nullable(),
    }),
    modules: modulesSchema,
    sisters: z.array(sisterSchema).max(1).default([]),
  })
  .superRefine((config, ctx) => {
    if (!config.locales.supported.includes(config.locales.default)) {
      ctx.addIssue({ code: 'custom', path: ['locales', 'default'], message: 'not in supported' })
    }
    for (const [path, ids] of [
      [['money', 'markets'], config.money.markets.map((market) => market.id)],
      [['sellers'], config.sellers.map((seller) => seller.id)],
    ] as const) {
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({ code: 'custom', path: [...path], message: 'ids must be unique' })
      }
    }
  })
  // A seller that names no couriers ships with the brand's: resolved once, here, so a consumer
  // reads one list per seller (`SellerConfig.shipping`) and never merges the two itself.
  .transform((config) => ({
    ...config,
    sellers: config.sellers.map((seller): SellerConfig => ({
      ...seller,
      shipping: { providers: [...(seller.shipping ?? config.shipping).providers] },
    })),
  }))

/** The parsed config, defaults applied — what every consumer reads. */
export type BrandConfig = z.infer<typeof brandConfigSchema>
/** The file as authored, before defaults (`brand:create`, fixtures). */
export type BrandConfigInput = z.input<typeof brandConfigSchema>

function isRegExp(source: string): boolean {
  try {
    return new RegExp(source) instanceof RegExp
  } catch {
    return false
  }
}
