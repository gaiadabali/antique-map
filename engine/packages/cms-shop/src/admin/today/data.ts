/**
 * The "Today" home's reads (TASKS.md 27.6.a; the plan's §3.1): the orders to act on by where they
 * stand, the stock at or under the low-stock line, the shop's drafts, the new leads and the last
 * seven days' sales. Every read is the Local API as the signed-in person (`overrideAccess: false`),
 * so a number is what that person may see — an editor gets no leads or money, because `leads` and
 * the owner check below say so. A read that fails shows nothing rather than a wrong zero (`null`).
 *
 * Sales are ANALYTICS.md §8's paid orders: a `payment.paidAt` in the window and a status never
 * cancelled or expired; the money is each order's own `totals.total`, integer rupiah, summed once.
 */
import { hasRole } from '@engine/cms-core/access'
import type { Payload, Where } from 'payload'

import { PAID_ORDER_EXCLUDED_STATUSES } from '../dashboard/sales'
import { tabWhere, type InboxTab } from '../orders/inbox'
import { shopOnly } from '../../site'
import { lowStockThreshold } from '../stock-matrix/data'

/** The inbox's tabs that still wait for someone, in the order work flows. */
export const ACTING_TABS = ['needs_action', 'processing', 'waiting_driver', 'on_the_way'] as const
export type ActingTab = (typeof ACTING_TABS)[number] & InboxTab

export const SALES_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

export type Today = {
  readonly orders: Readonly<Record<ActingTab, number | null>>
  readonly lowStock: { readonly rows: number | null; readonly threshold: number } | null
  readonly drafts: { readonly products: number | null; readonly pages: number | null } | null
  readonly leads: number | null
  readonly sales: { readonly orders: number; readonly revenue: number } | null
}

type Person = { readonly payload: Payload; readonly user: unknown }

async function counted(
  { payload, user }: Person,
  collection: 'orders' | 'stock-levels' | 'products' | 'pages' | 'leads',
  where: Where,
): Promise<number | null> {
  try {
    const { totalDocs } = await payload.count({
      collection,
      overrideAccess: false,
      user: user as never,
      where,
    })
    return totalDocs
  } catch {
    return null
  }
}

/** Paid orders of the last seven days and their total, in whole rupiah; the owner's alone. */
export async function loadSales(person: Person, now = new Date()): Promise<Today['sales']> {
  if (!hasRole(person.user as never, 'owner')) return null
  try {
    const since = new Date(now.getTime() - SALES_DAYS * DAY_MS).toISOString()
    const found = await person.payload.find({
      collection: 'orders',
      overrideAccess: false,
      user: person.user as never,
      depth: 0,
      pagination: false,
      limit: 0,
      select: { totals: { total: true } },
      where: {
        and: [
          { 'payment.paidAt': { greater_than_equal: since } },
          { status: { not_in: [...PAID_ORDER_EXCLUDED_STATUSES] } },
        ],
      },
    })
    const docs = found.docs as unknown as { totals?: { total?: unknown } }[]
    const revenue = docs.reduce((sum, doc) => sum + (Number(doc.totals?.total) || 0), 0)
    return { orders: docs.length, revenue }
  } catch {
    return null
  }
}

export async function loadToday(person: Person, now = new Date()): Promise<Today> {
  const catalogue = hasRole(person.user as never, 'owner', 'editor')
  const owner = hasRole(person.user as never, 'owner')
  const shopPages = shopOnly(person.payload, 'pages')
  const threshold = await lowStockThreshold(person.payload).catch(() => null)
  const [orderCounts, lowRows, products, pages, leads, sales] = await Promise.all([
    Promise.all(ACTING_TABS.map((tab) => counted(person, 'orders', tabWhere(tab, null, null)))),
    threshold === null
      ? null
      : counted(person, 'stock-levels', { quantity: { less_than_equal: threshold } }),
    catalogue ? counted(person, 'products', { _status: { equals: 'draft' } }) : null,
    catalogue
      ? counted(person, 'pages', {
          and: [{ _status: { equals: 'draft' } }, ...(shopPages ? [shopPages] : [])],
        })
      : null,
    owner ? counted(person, 'leads', { status: { equals: 'new' } }) : null,
    loadSales(person, now),
  ])
  return {
    orders: Object.fromEntries(
      ACTING_TABS.map((tab, i) => [tab, orderCounts[i] ?? null]),
    ) as Record<ActingTab, number | null>,
    lowStock: threshold === null ? null : { rows: lowRows, threshold },
    drafts: catalogue ? { products, pages } : null,
    leads: owner ? leads : null,
    sales,
  }
}
