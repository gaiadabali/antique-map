/**
 * The module rules of `validateBrandConfigs()` (C1's header list): what the chosen app can
 * render, which modules only make sense together (or with the data they work on — a sister to
 * link to), and the purchase panel's actions, each of which opens a flow some module owns —
 * `buy` the bag's, `purchase.checkout` (v1.5) — or needs a number to reach: `whatsapp` and
 * `call` (v1.5). A flag is a capability, never a brand (BRANDS.md §4).
 */
import {
  hasModule,
  MODULE_KEYS,
  type AppSupports,
  type BrandConfig,
  type ModuleKey,
  type PurchaseAction,
} from '../../schema'
import type { ConfigPath, Report } from '../issues'

/** The module whose flow an action opens; an action absent here needs none. */
const ACTION_MODULES: Partial<Record<PurchaseAction, ModuleKey>> = {
  // The bag and its checkout (C1 v1.5): no Buy at a brand that sells by invoice alone (D50).
  buy: 'purchase.checkout',
  offer: 'purchase.offers',
  reserve: 'purchase.holds',
  requestPrice: 'purchase.requestPrice',
  viewing: 'services.appointments',
  proforma: 'purchase.invoices',
}

export function checkModules(
  config: BrandConfig,
  report: Report,
  supports: AppSupports | undefined,
): void {
  const on = MODULE_KEYS.filter((key) => hasModule(config, key))
  if (supports) checkSupports(config, on, supports, report)

  const needs = (key: ModuleKey, other: ModuleKey, why: string) => {
    if (hasModule(config, key) && !hasModule(config, other)) {
      report(['modules', key], `needs "${other}" on as well: ${why}`)
    }
  }
  needs('retention.wishlist', 'accounts.buyers', 'its saved items are a buyer account’s (D35)')
  if (hasModule(config, 'retention.wishlist') && hasModule(config, 'retention.deviceWishlist')) {
    report(
      ['modules', 'retention.deviceWishlist'],
      'cannot be on beside "retention.wishlist": saved items live in the account or on the device, never both (D35)',
    )
  }
  needs('retention.wantList', 'accounts.buyers', 'its lists are a buyer account’s (D39)')
  needs(
    'retention.wantList',
    'retention.emailWantList',
    'every want list is made on the want-list page and sent by email, so an account’s builds on an address’s (D39)',
  )
  if (hasModule(config, 'accounts.retailers') && config.commerce.trade === null) {
    report(
      ['commerce', 'trade'],
      'must be set while "accounts.retailers" is on: approving a partner assigns its defaultTier (D32)',
    )
  }
  if (hasModule(config, 'sister.links') && config.sisters.length === 0) {
    report(
      ['modules', 'sister.links'],
      'needs a sister in "sisters": its cross-links and work sync are with that brand (BRANDS.md §5)',
    )
  }
  checkPurchaseTiers(config, report)
}

function checkSupports(
  config: BrandConfig,
  on: readonly ModuleKey[],
  supports: AppSupports,
  report: Report,
): void {
  if (supports.storefront !== config.storefront) {
    report(
      ['storefront'],
      `is "${config.storefront}", but was checked against the ${supports.storefront} app's supports`,
    )
    return
  }
  for (const key of on) {
    if (!supports.modules.includes(key)) {
      report(
        ['modules', key],
        `is on, but the ${config.storefront} app cannot render it (its supports omit it, BRANDS.md §6)`,
      )
    }
  }
}

function checkPurchaseTiers(config: BrandConfig, report: Report): void {
  // No tiers means every priced unique item leads with Buy (C1 `purchaseTiers`), so a brand
  // selling one-of-ones with no bag must say what its panel leads with instead.
  if (
    config.commerce.purchaseTiers.length === 0 &&
    hasModule(config, 'catalogue.unique') &&
    !hasModule(config, 'purchase.checkout')
  ) {
    report(
      ['commerce', 'purchaseTiers'],
      'is empty, so every unique item would lead with "buy", whose module "purchase.checkout" is off: give a tier the actions it leads with (D50)',
    )
  }
  config.commerce.purchaseTiers.forEach((tier, i) => {
    const at: ConfigPath = ['commerce', 'purchaseTiers', i]
    const actions: [ConfigPath, PurchaseAction][] = [
      [[...at, 'primary'], tier.primary],
      ...tier.secondary.map((action, j): [ConfigPath, PurchaseAction] => [
        [...at, 'secondary', j],
        action,
      ]),
    ]
    for (const [path, action] of actions) {
      const module = ACTION_MODULES[action]
      if (module && !hasModule(config, module)) {
        report(path, `"${action}" opens a flow of "${module}", which is off`)
      }
      if (action === 'whatsapp' && config.identity.contact.whatsapp === null) {
        report(path, '"whatsapp" needs identity.contact.whatsapp, the number the button opens')
      }
      if (action === 'call' && config.identity.contact.phone === null) {
        report(path, '"call" needs identity.contact.phone, the number the link dials')
      }
    }
  })
}
