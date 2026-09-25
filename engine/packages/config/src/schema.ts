/**
 * @contract C1 — the brand config schema and module registry · owner: ARC · consumers: every lane
 *
 * The shape of `<brand>/site/brand.config.json` (BRANDS.md §3) and the module flags
 * (BRANDS.md §4). A difference between brands is a field here, a module flag or a
 * property of the data — never a branch on a brand (CONVENTIONS.md §1). Editorial fields
 * are floors that CMS globals override. Rules needing the app or the whole config
 * (modules ⊆ the app's `supports`, a rounding rule per market currency, sellers covering
 * every market, a segment map per supported locale) are `validateBrandConfigs()`'s;
 * secrets and environment are `bootCheck()`'s (both PLT, TASKS.md 0.6).
 *
 * `@engine/config` imports no other engine package: config ← domain ← view-models.
 */
import { z } from 'zod'

import { localeCodeSchema, localisedTextSchema, routeMapSchema, routeTargetSchema } from './routes'

export { LOCALE_CODES, localeCodeSchema, type LocaleCode } from './routes'
export { localisedTextSchema, type LocalisedText } from './routes'

// ── Money primitives — C5 (`@engine/domain/money`) builds `Money` and `PriceSet` on these ──

/** Minor-unit exponent per ISO 4217 currency the engine prices in. Never hard-code 100. */
export const CURRENCY_EXPONENT = { IDR: 0, USD: 2, SGD: 2, EUR: 2, AUD: 2, GBP: 2 } as const
export type CurrencyCode = keyof typeof CURRENCY_EXPONENT
export const CURRENCY_CODES = Object.keys(CURRENCY_EXPONENT) as [CurrencyCode, ...CurrencyCode[]]
export const currencyCodeSchema = z.enum(CURRENCY_CODES)

/** ISO 3166-1 alpha-2, upper case. */
export const countryCodeSchema = z.string().regex(/^[A-Z]{2}$/, 'an ISO 3166-1 alpha-2 code')
export type CountryCode = z.infer<typeof countryCodeSchema>

/** A country, or `*` for the rest of the world. */
export const destinationSchema = z.union([countryCodeSchema, z.literal('*')])
export type Destination = z.infer<typeof destinationSchema>

/** Integer minor units: `z.int()` accepts safe integers only, so a float never parses. */
export const moneySchema = z.strictObject({ amount: z.int(), currency: currencyCodeSchema })
const positiveMoneySchema = moneySchema.refine((m) => m.amount > 0, 'a positive amount')

// ── Vocabularies. C7 (payments, shipping, fulfilment) imports these ids, never redeclares ──

export const STOREFRONTS = ['gallery', 'emporium'] as const
export type Storefront = (typeof STOREFRONTS)[number]

/** PAYMENTS.md §2 `ProviderId`. */
export const PAYMENT_PROVIDERS = [
  'manual',
  'bank-transfer',
  'stripe',
  'midtrans',
  'xendit',
  'doku',
  'paypal',
] as const
export type PaymentProviderId = (typeof PAYMENT_PROVIDERS)[number]

/** Method families a buyer chooses between — what `methodOrder` sorts (PAYMENTS.md §3). */
export const PAYMENT_METHODS = [
  'card',
  'express-wallet',
  'paynow',
  'ideal',
  'sepa-debit',
  'va',
  'qris',
  'ewallet',
  'retail',
  'paylater',
  'bank-transfer',
  'paypal',
  'manual',
] as const
export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]

export const SHIPPING_PROVIDERS = ['flat', 'biteship', 'dhl-express', 'quote', 'collect'] as const
export type ShippingProviderId = (typeof SHIPPING_PROVIDERS)[number]

export const FULFILMENT_PROVIDERS = ['own-stock', 'local-production', 'prodigi', 'gelato'] as const
export type FulfilmentProviderId = (typeof FULFILMENT_PROVIDERS)[number]

export const TAX_REGIMES = ['ID-PPN', 'SG-GST', 'none'] as const
export type TaxRegime = (typeof TAX_REGIMES)[number]

/** COMMERCE.md §4. */
export const INVENTORY_MODELS = [
  'unique',
  'edition',
  'stocked',
  'made-to-order',
  'pod',
  'service',
] as const
export type InventoryModel = (typeof INVENTORY_MODELS)[number]

/** What a purchase panel can offer (COMMERCE.md §7); `ItemVM.purchase` (C2) uses these. */
export const PURCHASE_ACTIONS = [
  'buy',
  'reserve',
  'offer',
  'enquire',
  'whatsapp',
  'requestPrice',
  'viewing',
  'proforma',
] as const
export type PurchaseAction = (typeof PURCHASE_ACTIONS)[number]

// ── Modules — capabilities, never brands (BRANDS.md §4); `hasModule()` takes the keys ──

export const MODULES = {
  'catalogue.unique': 'One-of-one items: checkout lock, sold archive, "notify me of similar"',
  'catalogue.variants': 'Variant axes, SKUs and stock',
  'catalogue.productTypes': 'Product-type templates that generate variants from a design',
  'purchase.offers': 'Make an offer → accept / counter / decline → private payment link',
  'purchase.holds': 'Staff-granted reservations with an expiry',
  'purchase.requestPrice': 'Price-on-request items and the request flow',
  'purchase.invoices': 'Proforma invoice, bank transfer and PO number (institutions, B2B)',
  'media.deepZoom': 'IIIF tiles and the zoom viewer on the item page',
  'media.roomView': '"On the wall" scale preview',
  'configurator.framing': 'Size × paper × frame × mount configurator with a live preview',
  'content.makers': 'Cartographer, engraver, publisher and photographer pages',
  'content.gazetteer': 'Place pages; historical ↔ modern place names in search',
  'content.catalogues': 'Curated web catalogues with live availability',
  'content.journal': 'Stories and articles',
  'content.exhibitions': 'Fairs, exhibitions, viewings and an events calendar',
  'content.linkInBio': 'The link-in-bio page: CMS-curated posts and the products each shows',
  'services.consignment': '"Sell to us" submissions with photos',
  'services.appointments': 'Book a visit to a gallery or showroom',
  'services.wholesale': 'Trade, hotel and corporate-gifting enquiries and tiers',
  'retention.wishlist': 'Saved items',
  'retention.wantList': 'Saved searches and "tell me when another example arrives"',
  'retention.newsletter': 'Newsletter signup, digest and the issue archive',
  'retention.reviews': 'Product reviews from verified orders',
  'retention.backInStock': 'Restock alerts',
  'retention.abandonedCart': 'Cart-recovery email',
  'commerce.giftCards': 'Digital gift cards: buy, schedule for a recipient, check a balance',
  'commerce.giftWrap': 'Gift wrap as a service line, gift notes, prices hidden on the slip',
  'commerce.discounts': 'Discount codes and automatic rules',
  'commerce.bundles': 'Bundles, sets and multi-buy rules',
  'fulfilment.pod': 'Print-on-demand routing near the buyer (v2)',
  'fulfilment.clickAndCollect': 'Pickup at a gallery or showroom',
  'sister.links': '"Own the original" ↔ "get a print" cross-links and work sync',
  'ai.cataloguing': 'Vision-assisted draft cataloguing in the admin, always human-verified',
  'channels.marketplaces': 'Marketplace channel sync (later)',
} as const satisfies Record<string, string>
export type ModuleKey = keyof typeof MODULES
export const MODULE_KEYS = Object.keys(MODULES) as [ModuleKey, ...ModuleKey[]]

/** The only way code asks what a brand can do (CONVENTIONS.md §1). */
export function hasModule(config: Pick<BrandConfig, 'modules'>, key: ModuleKey): boolean {
  return config.modules[key] === true
}

// ── Identity, assets, tokens ───────────────────────────────────────────────────────────

const idSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'a kebab-case id')
const assetSchema = z.string().regex(/^(?!.*\.\.)\w[\w./-]*$/, 'a path in <brand>/site/assets')
const hexSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'a #rrggbb colour')

/**
 * The brand-overridable token subset (DESIGN-SYSTEM.md §4; C3 re-exports it). Hex, so the
 * contrast gate can compute it: one failing pairing rejects the whole override.
 * `--font-display` names a family declared in `assets.fonts`.
 */
export const tokenOverridesSchema = z
  .strictObject({
    '--c-accent': hexSchema,
    '--c-accent-ink': hexSchema,
    '--c-ground': hexSchema,
    '--c-ink': hexSchema,
    '--font-display': z.string().min(1),
  })
  .partial()
export type TokenOverrides = z.infer<typeof tokenOverridesSchema>
export type BrandTokenName = keyof TokenOverrides
export const BRAND_TOKEN_NAMES = Object.keys(tokenOverridesSchema.shape) as BrandTokenName[]

/** Files in `<brand>/site/assets/`, served at runtime from `/brand-assets/<path>` (C13). */
const assetsSchema = z.strictObject({
  logo: assetSchema,
  mark: assetSchema.nullable().default(null),
  favicon: assetSchema,
  ogImage: assetSchema,
  fonts: z
    .array(
      z.strictObject({
        family: z.string().min(1),
        src: assetSchema,
        weight: z.string().default('400'),
        style: z.enum(['normal', 'italic']).default('normal'),
      }),
    )
    .default([]),
})

const navItemSchema = routeTargetSchema.extend({ label: localisedTextSchema })

/** Floors for the `brandSettings` and `navigation` globals (BRANDS.md §3). */
const identitySchema = z.strictObject({
  contact: z.strictObject({
    email: z.email(),
    whatsapp: z.e164().nullable().default(null),
    phone: z.e164().nullable().default(null),
  }),
  social: z.partialRecord(z.enum(['instagram', 'facebook', 'tiktok', 'youtube']), z.url()),
  announcement: localisedTextSchema.nullable().default(null),
  navigation: z.strictObject({ header: z.array(navItemSchema), footer: z.array(navItemSchema) }),
})

// ── Money, markets, sellers, commerce ──────────────────────────────────────────────────

/** A destination group and its currency (COMMERCE.md §3). */
export const marketSchema = z.strictObject({
  id: idSchema,
  destinations: z.array(destinationSchema).min(1),
  currency: currencyCodeSchema,
  pricesIncludeTax: z.boolean().default(true),
})
export type MarketConfig = z.infer<typeof marketSchema>

/** A derived price rounds to a multiple of `step` minor units: IDR 50000 = Rp 50.000. */
export const roundingRuleSchema = z.strictObject({
  step: z.int().positive(),
  mode: z.enum(['up', 'half-even']).default('up'),
})
export type RoundingRule = z.infer<typeof roundingRuleSchema>

/** A seller of record, chosen per checkout by stock location and destination (COMMERCE.md §2). */
export const sellerSchema = z.strictObject({
  id: idSchema,
  /** A placeholder legal entity (owner decisions D1–D3): refused by `bootCheck()` in production. */
  draft: z.boolean().default(false),
  entity: z.strictObject({
    name: z.string().min(1),
    country: countryCodeSchema,
    registration: z.string().min(1),
    address: z.array(z.string().min(1)).default([]),
  }),
  serves: z.strictObject({
    stockLocations: z.array(idSchema).min(1),
    destinations: z.array(destinationSchema).min(1),
  }),
  tax: z.strictObject({ regime: z.enum(TAX_REGIMES), registered: z.boolean() }),
  charge: z.array(currencyCodeSchema).min(1),
  payments: z.array(z.enum(PAYMENT_PROVIDERS)).min(1),
  methodOrder: z.array(z.enum(PAYMENT_METHODS)).default([]),
  /** Cards above this route to bank transfer or invoice (PAYMENTS.md §3). */
  cardCeiling: positiveMoneySchema.nullable().default(null),
  /** Originals above this ship on a quote with fine-art cover (COMMERCE.md §8). */
  insuredThreshold: positiveMoneySchema.nullable().default(null),
  duties: z.enum(['DAP', 'DDP']).default('DAP'),
  /** Prefix of the seller's gapless order, proforma and invoice numbers (COMMERCE.md §12). */
  documentPrefix: z.string().regex(/^[A-Z0-9]{1,8}$/, '1–8 upper-case letters or digits'),
})
export type SellerConfig = z.infer<typeof sellerSchema>

/** Named reservation TTLs (COMMERCE.md §4); the lock margin is PAYMENTS.md §1 rule 4's. */
const ttlSchema = z.strictObject({
  checkoutLockMinutes: z.int().positive().default(15),
  lockMarginMinutes: z.int().nonnegative().default(10),
  holdDefaultHours: z.int().positive().default(48),
  holdMaxHours: z.int().positive().default(72),
  offerHoldHours: z.int().positive().default(48),
  offerCounterHours: z.int().positive().default(72),
  invoiceHoldDays: z.int().positive().default(7),
})
export type CommerceTtl = z.infer<typeof ttlSchema>

/** Ascending by `upTo`, in base-currency minor units; the last tier has `upTo: null`. */
export const purchaseTierSchema = z.strictObject({
  upTo: z.int().positive().nullable(),
  primary: z.enum(PURCHASE_ACTIONS),
  secondary: z.array(z.enum(PURCHASE_ACTIONS)).default([]),
})
export type PurchaseTier = z.infer<typeof purchaseTierSchema>

export const sisterSchema = z.strictObject({
  slug: idSchema,
  name: z.string().min(1),
  role: z.enum(['archive-origin', 'merch-outlet']),
  baseUrl: z.url(),
})
export type SisterConfig = z.infer<typeof sisterSchema>

// ── The config ─────────────────────────────────────────────────────────────────────────

export const brandConfigSchema = z
  .strictObject({
    $schema: z.string().optional(),
    /** A scaffolded or placeholder config (`brand:create`): refused in production. */
    draft: z.boolean().default(false),
    slug: idSchema,
    name: z.string().min(1),
    domains: z.strictObject({
      production: z.hostname().nullable(),
      staging: z.hostname().nullable(),
      aliases: z.array(z.hostname()).default([]),
    }),
    storefront: z.enum(STOREFRONTS),
    identity: identitySchema,
    assets: assetsSchema,
    tokens: tokenOverridesSchema.default({}),
    locales: z.strictObject({
      default: localeCodeSchema,
      supported: z.array(localeCodeSchema).min(1),
    }),
    routes: routeMapSchema,
    ids: z.strictObject({
      /** Works get `<prefix>-000123`, the id sister sync and redirects key on. */
      workUidPrefix: z.string().regex(/^[A-Z][A-Z0-9]{1,7}$/, '2–8 upper-case letters or digits'),
      stockNumberPattern: z.string().refine(isRegExp, 'a regular expression').nullable(),
    }),
    money: z.strictObject({
      base: currencyCodeSchema,
      markets: z.array(marketSchema).min(1),
      rounding: z.partialRecord(currencyCodeSchema, roundingRuleSchema),
      fx: z.strictObject({
        source: z.enum(['ecb-reference', 'manual']),
        bufferPct: z.partialRecord(currencyCodeSchema, z.number().min(0).max(20)),
      }),
    }),
    sellers: z.array(sellerSchema).min(1),
    commerce: z.strictObject({
      inventoryModels: z.array(z.enum(INVENTORY_MODELS)).min(1),
      ttl: ttlSchema.prefault({}),
      purchaseTiers: z.array(purchaseTierSchema).default([]),
    }),
    shipping: z.strictObject({ providers: z.array(z.enum(SHIPPING_PROVIDERS)).min(1) }),
    fulfilment: z.strictObject({ providers: z.array(z.enum(FULFILMENT_PROVIDERS)).min(1) }),
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
    /** A module that is absent is off. */
    modules: z.partialRecord(z.enum(MODULE_KEYS), z.boolean()),
    sisters: z.array(sisterSchema).default([]),
  })
  .superRefine((config, ctx) => {
    if (!config.locales.supported.includes(config.locales.default)) {
      ctx.addIssue({ code: 'custom', path: ['locales', 'default'], message: 'not in supported' })
    }
    for (const [path, ids] of [
      [['money', 'markets'], config.money.markets.map((m) => m.id)],
      [['sellers'], config.sellers.map((s) => s.id)],
    ] as const) {
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({ code: 'custom', path: [...path], message: 'ids must be unique' })
      }
    }
  })

/** The parsed config — what every consumer reads. */
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
