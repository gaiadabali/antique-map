/**
 * The shop's chat (AI.md §2.3): warm and brisk, amounts only as a tool returned them, the
 * published `products` and the active `stores` as its catalogue. The text is frozen — it is part
 * of the cached prompt prefix.
 */
import 'server-only'

import { createHref, SITES, sisterOrigin } from '@engine/config/sites'

import { getProduct, searchProducts, type ProductSummary } from '../projection/products'
import { deliveryInfo, findStores } from '../projection/stores'
import { SHOP_TOOLS } from '../tools/schemas'
import type { ChatEvent } from '../types'
import type { ChatSiteConfig, SiteCatalogue } from './config'

const PERSONA = `You are the AI assistant of ${SITES.shop.name}, a shop of merchandise sold online and in stores across Bali. Your voice is warm, helpful and brisk: short answers.`

const RULES = `- State an amount of money only by copying a priceLabel, feeLabel or freeOverLabel that a tool returned in this conversation, verbatim. Never compute a total, a discount or a converted price; totals and delivery are calculated at checkout.
- Stock: "in stock" only as a tool returned it. Never mention quantities or which store holds an item.
- Delivery: only from delivery_info. Online orders are delivered, never collected. Promise no delivery times.
- Order questions: point to the tracking link in the buyer's confirmation, or hand off (topic "order"). You cannot look up orders.
- Antique maps, prints and original photographs are not sold here: they are ${SITES.gallery.name}'s, our sister gallery. When asked about antiques or originals, say so in a sentence and call sister_site, which shows its link. Never describe, value or price an antique.`

function productCard(product: ProductSummary): ChatEvent {
  return {
    type: 'card',
    kind: 'product',
    id: product.id,
    title: product.title,
    url: product.url,
    image: product.image,
    statusLabel: product.statusLabel,
    ...(product.priceLabel ? { priceLabel: product.priceLabel } : {}),
  }
}

const galleryHref = createHref(SITES.gallery)

const catalogue: SiteCatalogue = {
  async search(call, ctx) {
    const results = await searchProducts(
      ctx.reader,
      { query: call.query, category: call.filters.category, limit: call.limit },
      ctx.locale,
      ctx.t,
    )
    results.forEach((product) => {
      ctx.itemIds.add(product.id)
      if (product.priceLabel) ctx.notePrice(product.priceLabel)
    })
    return { result: { results }, events: results.map(productCard) }
  },
  async get(id, ctx) {
    const product = await getProduct(ctx.reader, id, ctx.locale, ctx.t)
    if (product === null) return { result: { found: false }, events: [] }
    ctx.itemIds.add(product.id)
    for (const label of [product.priceLabel, ...product.variants.map((v) => v.priceLabel)]) {
      if (label) ctx.notePrice(label)
    }
    return { result: { found: true, item: product }, events: [productCard(product)] }
  },
  async handoffItem(id, ctx) {
    const product = await getProduct(ctx.reader, id, ctx.locale, ctx.t)
    return product ? { title: product.title, ref: product.sku, url: product.url } : null
  },
  delivery: (ctx) => deliveryInfo('shop', ctx.settings, ctx.locale, ctx.t),
  stores: (area, ctx) => findStores(ctx.reader, area, ctx.locale),
  sister: ({ locale, t }) => {
    const origin = sisterOrigin('shop')
    if (origin === null) return null
    return {
      kind: 'site',
      id: 'gallery',
      title: t('sister.gallery', { name: SITES.gallery.name }),
      url: `${origin}${galleryHref('home', {}, locale)}`,
      image: null,
    }
  },
}

export const shopChat: ChatSiteConfig = {
  site: 'shop',
  prompt: { persona: PERSONA, rules: RULES },
  tools: SHOP_TOOLS,
  searchFilters: ['category'],
  catalogue,
}
