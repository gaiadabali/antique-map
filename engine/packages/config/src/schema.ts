/**
 * @contract C1 — the brand config schema and module registry · owner: ARC · consumers: every lane
 *
 * The entry of `@engine/config/schema`: the shape of `<brand>/site/brand.config.json`
 * (BRANDS.md §3), composed from `./schema/*` — primitives (the money base C5 builds on),
 * money and markets, sellers, commerce, modules, the look and identity. A difference
 * between brands is a field here, a module flag or a property of the data — never a branch
 * on a brand (CONVENTIONS.md §1). Structural settings need a deploy; editorial ones are
 * floors that CMS globals override.
 *
 * Rules needing the app or the whole config — modules ⊆ the app's `supports`, a rounding
 * rule per market currency, sellers covering every market, a segment map and default-locale
 * text per supported locale, `--font-display` declared in `assets.fonts` — are
 * `validateBrandConfigs()`'s; secrets and environment are `bootCheck()`'s (PLT, 0.6).
 *
 * `@engine/config` imports no other engine package: config ← domain ← view-models.
 */
import { z } from 'zod'

import { localeCodeSchema, routeMapSchema } from './routes'
import {
  commerceConfigSchema,
  fulfilmentConfigSchema,
  shippingConfigSchema,
} from './schema/commerce'
import { domainsSchema, identitySchema, sisterSchema } from './schema/identity'
import { assetsSchema, STOREFRONTS, tokenOverridesSchema } from './schema/look'
import { moneyConfigSchema } from './schema/money'
import { modulesSchema } from './schema/modules'
import { idSchema } from './schema/primitives'
import { sellerSchema } from './schema/sellers'

export * from './schema/commerce'
export * from './schema/identity'
export * from './schema/look'
export * from './schema/money'
export * from './schema/modules'
export * from './schema/primitives'
export * from './schema/sellers'
export { LOCALE_CODES, localeCodeSchema, type LocaleCode } from './routes'
export { localisedTextSchema, type LocalisedText } from './routes'

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
    sisters: z.array(sisterSchema).default([]),
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
