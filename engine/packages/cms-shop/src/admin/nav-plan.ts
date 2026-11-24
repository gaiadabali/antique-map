/**
 * The shop's sidebar plan (TASKS.md 27.6.b; `old-east-indies-cms.md` §3.1), laid out by the shared
 * mechanism (`@engine/cms-core/admin/nav/plan`): the shop's work in five groups — Content, Orders,
 * Catalogue, Stores, Settings — with the working screens (the orders inbox, the stock matrix, the
 * imports) among the collections they serve, then the technical records, folded, the owner's alone.
 * A store user is offered exactly their two screens: Orders and Stock by store.
 *
 * Today's one CMS (`@engine/cms`) builds its plan from the same sections, with its leads inbox and
 * seed screen and the gallery's folded section after them (phase 26 retires it).
 */
import {
  ALL_STAFF,
  CATALOGUE,
  collection,
  global,
  link,
  OWNER,
  type NavEntry,
  type NavSection,
} from '@engine/cms-core/admin/nav/plan'

/** Above the groups: the shop's "Today" numbers (`./today`, at `/admin/today`). Store staff land on their orders. */
export const TODAY = link('today', '/admin/today', CATALOGUE)

export type ShopNavOptions = {
  /** The leads' door in Orders: the leads inbox where a CMS has one, else the collection's list. */
  readonly leads: NavEntry
  /** Working screens a CMS adds at the foot of the technical records (today's seed screen). */
  readonly technical?: readonly NavEntry[]
}

/** The shop's sections, in the plan's order. */
export function shopNavSections(options: ShopNavOptions): NavSection[] {
  return [
    // Content first: what the owner's people change most (the owner's order, 2026-11-16).
    {
      group: 'content',
      entries: [
        collection('pages'),
        collection('articles'),
        global('shop-header'),
        global('shop-footer'),
        collection('media'),
      ],
    },
    {
      group: 'orders',
      entries: [
        link('ordersInbox', '/admin/orders', ALL_STAFF),
        options.leads,
        collection('partners'),
      ],
    },
    {
      group: 'catalogue',
      entries: [
        collection('products'),
        collection('categories'),
        collection('themes'),
        collection('discounts'),
      ],
    },
    {
      group: 'stores',
      entries: [
        collection('stores', CATALOGUE),
        link('stockMatrix', '/admin/stock', ALL_STAFF),
        link('imports', '/admin/stock-import', OWNER),
      ],
    },
    {
      group: 'settings',
      entries: [global('site-settings'), collection('users'), collection('chat-sessions')],
    },
    {
      group: 'technical',
      folded: true,
      entries: [
        collection('redirects', OWNER),
        collection('order-notifications', OWNER),
        collection('payment-events', OWNER),
        collection('events', OWNER),
        ...(options.technical ?? []),
      ],
    },
  ]
}

/**
 * The shop app's own plan (`cms-shop`): no leads inbox yet, so the owner reaches the leads by their
 * list (the inbox moves with phase 25's shared admin, `gallery-cms.md`).
 */
export const SHOP_NAV_PLAN: readonly NavSection[] = shopNavSections({
  leads: collection('leads', OWNER),
})
