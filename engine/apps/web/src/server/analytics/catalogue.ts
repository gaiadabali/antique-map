/**
 * The event catalogue (ANALYTICS.md §4): every event name, the sites it belongs to and a schema of
 * its props. `validateEvent` is what collect runs on every beacon event: an unknown name, a prop
 * outside its schema, or an impossible value (a negative count, an LCP over 60 s) drops the event.
 * Names are never renamed — the dashboard depends on the string.
 */
import { validProps, type EventSpec } from './props'

const CHANNELS = ['whatsapp', 'email', 'form'] as const
const CONTEXTS = ['item', 'product', 'page', 'footer', 'chat'] as const
const PAGE_TYPES = [
  'home',
  'listing',
  'item',
  'product',
  'search',
  'page',
  'track',
  'cart',
  'checkout',
] as const
const LISTING_TYPES = ['type', 'maker', 'place', 'subject', 'category', 'all'] as const

const MAX_PROPS_BYTES = 2048

/** The catalogue: `B` events arrive through collect; `S` events are written by server code that
 * reuses the same schemas. A prop not listed does not exist. */
export const EVENT_CATALOGUE = {
  'page.viewed': { sites: 'both', props: { pageType: { kind: 'enum', values: PAGE_TYPES } } },
  'search.submitted': {
    sites: 'both',
    props: {
      query: { kind: 'string', max: 100 },
      resultCount: { kind: 'int', min: 0 },
      zeroResults: { kind: 'bool' },
    },
  },
  'listing.viewed': {
    sites: 'both',
    props: {
      listing: { kind: 'enum', values: LISTING_TYPES },
      facets: { kind: 'facets' },
      resultCount: { kind: 'int', min: 0 },
    },
  },
  'item.viewed': {
    sites: 'gallery',
    props: {
      workId: { kind: 'int', min: 1 },
      objectType: { kind: 'string', max: 120 },
      status: { kind: 'string', max: 60 },
    },
  },
  'item.zoomed': {
    sites: 'gallery',
    props: {
      workId: { kind: 'int', min: 1 },
      imageRole: { kind: 'string', max: 60 },
      maxZoom: { kind: 'int', min: 1, max: 50 },
    },
  },
  'product.viewed': {
    sites: 'shop',
    props: {
      productId: { kind: 'int', min: 1 },
      categorySlug: { kind: 'string', max: 120 },
      inStock: { kind: 'bool' },
    },
  },
  'ask.clicked': {
    sites: 'both',
    props: {
      channel: { kind: 'enum', values: CHANNELS },
      context: { kind: 'enum', values: CONTEXTS },
      workId: { kind: 'int', min: 1, optional: true },
      productId: { kind: 'int', min: 1, optional: true },
    },
  },
  'sell.clicked': { sites: 'gallery', props: { channel: { kind: 'enum', values: CHANNELS } } },
  'partnership.clicked': { sites: 'shop', props: { channel: { kind: 'enum', values: CHANNELS } } },
  'lead.created': {
    sites: 'both',
    props: {
      kind: { kind: 'enum', values: ['ask', 'sell', 'partnership', 'contact', 'chat'] },
      source: { kind: 'enum', values: ['form', 'chat'] },
      leadId: { kind: 'int', min: 1 },
    },
  },
  'chat.started': {
    sites: 'both',
    props: { chatSessionId: { kind: 'int', min: 1 }, context: { kind: 'enum', values: CONTEXTS } },
  },
  'chat.handedOff': {
    sites: 'both',
    props: {
      chatSessionId: { kind: 'int', min: 1 },
      channel: { kind: 'enum', values: ['whatsapp', 'email'] },
      hasItem: { kind: 'bool' },
    },
  },
  'chat.leadCreated': {
    sites: 'both',
    props: { chatSessionId: { kind: 'int', min: 1 }, leadId: { kind: 'int', min: 1 } },
  },
  'cart.added': {
    sites: 'shop',
    props: {
      productId: { kind: 'int', min: 1 },
      variantSku: { kind: 'string', max: 60 },
      qty: { kind: 'int', min: 1, max: 100 },
      value: { kind: 'int', min: 0 },
    },
  },
  'cart.removed': {
    sites: 'shop',
    props: {
      productId: { kind: 'int', min: 1 },
      variantSku: { kind: 'string', max: 60 },
      qty: { kind: 'int', min: 1, max: 100 },
    },
  },
  'checkout.started': {
    sites: 'shop',
    props: { lines: { kind: 'int', min: 1 }, subtotal: { kind: 'int', min: 0 } },
  },
  'checkout.stepCompleted': {
    sites: 'shop',
    props: { step: { kind: 'enum', values: ['contact', 'delivery', 'review'] } },
  },
  'checkout.blocked': {
    sites: 'shop',
    props: {
      reason: {
        kind: 'enum',
        values: ['no-single-store', 'out-of-area', 'out-of-stock', 'price-changed', 'code-refused'],
      },
    },
  },
  'payment.opened': {
    sites: 'shop',
    props: { orderId: { kind: 'int', min: 1 }, attempt: { kind: 'int', min: 1, max: 20 } },
  },
  'order.created': {
    sites: 'shop',
    props: {
      orderId: { kind: 'int', min: 1 },
      lines: { kind: 'int', min: 1 },
      total: { kind: 'int', min: 0 },
      storeCode: { kind: 'string', max: 20 },
      distanceBand: { kind: 'string', max: 20 },
      hasDiscount: { kind: 'bool' },
    },
  },
  'order.paid': {
    sites: 'shop',
    props: {
      orderId: { kind: 'int', min: 1 },
      total: { kind: 'int', min: 0 },
      method: { kind: 'string', max: 40 },
    },
  },
  'order.statusChanged': {
    sites: 'shop',
    props: {
      orderId: { kind: 'int', min: 1 },
      from: { kind: 'string', max: 40 },
      to: { kind: 'string', max: 40 },
      byRole: { kind: 'enum', values: ['owner', 'editor', 'store', 'system'] },
      minutesSincePaid: { kind: 'int', min: 0 },
    },
  },
  'tracking.viewed': { sites: 'shop', props: { status: { kind: 'string', max: 40 } } },
  'vitals.reported': {
    sites: 'both',
    props: {
      pageType: { kind: 'enum', values: PAGE_TYPES },
      lcp: { kind: 'int', min: 0, max: 60_000 },
      inp: { kind: 'int', min: 0, max: 60_000 },
      cls: { kind: 'int', min: 0, max: 10 },
    },
  },
} as const satisfies Record<string, EventSpec>

export type CatalogueName = keyof typeof EVENT_CATALOGUE

/** The catalogue's names — the same list the `events` collection's select field offers. */
export const CATALOGUE_NAMES = Object.keys(EVENT_CATALOGUE) as CatalogueName[]

/** One event the beacon sent, as its caller sees it — every field unvalidated. */
export type IncomingEvent = {
  name: unknown
  at: unknown
  locale: unknown
  props: unknown
  url: unknown
  referrer: unknown
  utm: unknown
  surface: unknown
}

/** Whether the name is in the catalogue. */
export function isKnownName(name: unknown): name is CatalogueName {
  return typeof name === 'string' && Object.hasOwn(EVENT_CATALOGUE, name)
}

/**
 * One validated beacon event, or `null` — the drop reason is the caller's to count, by which
 * check failed: an unknown name, a site the event does not belong to, or props outside the schema.
 */
export function validateEvent(
  incoming: IncomingEvent,
  site: 'gallery' | 'shop',
): { name: CatalogueName; props: Record<string, unknown> } | null {
  if (!isKnownName(incoming.name)) return null
  const spec = EVENT_CATALOGUE[incoming.name]
  if (spec.sites !== 'both' && spec.sites !== site) return null
  const props = validProps(spec, incoming.props)
  if (props === null) return null
  if (JSON.stringify(props).length > MAX_PROPS_BYTES) return null
  return { name: incoming.name, props }
}
