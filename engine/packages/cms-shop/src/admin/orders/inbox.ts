/**
 * The orders inbox's tabs and search (TASKS.md 27.3.a; the plan §3.7): one door for every order,
 * in tabs by where it stands, each with its count, searched by buyer name, order number or phone.
 * Pure: it builds the `Where` each tab and the search ask Payload for. The reads (`./inbox-data`)
 * run them as the signed-in user, so a store user's tabs, counts and results are their store's
 * alone — scoped by the collection's own access rule, never by this file.
 */
import type { Where } from 'payload'

import type { OrderStatus } from '../../collections/orders/statuses'

export const INBOX_TABS = [
  'needs_action',
  'processing',
  'waiting_driver',
  'on_the_way',
  'delivered',
  'closed',
] as const

export type InboxTab = (typeof INBOX_TABS)[number]

/**
 * Each tab's statuses. "Needs action" is everything before the store starts: an order to price
 * (`awaiting_quote`), one waiting for the buyer's payment (`pending_payment`, shown so its store
 * sees it coming), and a paid order to start packing. A flagged order of any status is there too.
 */
export const TAB_STATUSES: Record<InboxTab, readonly OrderStatus[]> = {
  needs_action: ['awaiting_quote', 'pending_payment', 'paid'],
  processing: ['processing'],
  waiting_driver: ['waiting_driver'],
  on_the_way: ['on_the_way'],
  delivered: ['delivered'],
  closed: ['cancelled', 'expired'],
}

/** A tab named in the address, or "Needs action" for anything else. */
export function tabOf(value: unknown): InboxTab {
  return (INBOX_TABS as readonly unknown[]).includes(value) ? (value as InboxTab) : 'needs_action'
}

/** The tab an order sits in (its status; a flagged order also shows under "Needs action"). */
export function tabForStatus(status: OrderStatus): InboxTab {
  for (const tab of INBOX_TABS) if (TAB_STATUSES[tab].includes(status)) return tab
  return 'closed'
}

const SEARCH_MAX = 80

/**
 * The search box's `Where`, or `null` for an empty box: the buyer's name (contains), the order
 * number (a whole number, exactly — `#100042` too) and the buyer's WhatsApp (its digits, contains,
 * so `0812 3456` and `+62 812-3456` both find `+628123456…`). A Indonesian `0…` number is also
 * tried as `62…`, the form checkout stores it in.
 */
export function searchWhere(raw: unknown): Where | null {
  if (typeof raw !== 'string') return null
  const query = raw.trim().slice(0, SEARCH_MAX)
  if (query === '') return null
  const or: Where[] = [{ 'contact.name': { like: query } }]
  const number = query.replace(/^#/, '')
  if (/^\d{1,9}$/.test(number)) or.push({ number: { equals: Number(number) } })
  const digits = query.replace(/\D/g, '')
  if (digits.length >= 4) {
    or.push({ 'contact.whatsapp': { like: digits } })
    if (digits.startsWith('0')) or.push({ 'contact.whatsapp': { like: `62${digits.slice(1)}` } })
  }
  return { or }
}

/** A tab's `Where`, with the search when there is one, and the store filter for the owner. */
export function tabWhere(tab: InboxTab, search: Where | null, store: number | null): Where {
  const statuses: Where = { status: { in: [...TAB_STATUSES[tab]] } }
  const inTab: Where =
    tab === 'needs_action'
      ? { or: [statuses, { 'needsAttention.flag': { equals: true } }] }
      : statuses
  const and: Where[] = [inTab]
  if (search) and.push(search)
  if (store !== null) and.push({ store: { equals: store } })
  return { and }
}

/** "Needs action" waits oldest first (the first in is the first served); the rest newest first. */
export function tabSort(tab: InboxTab): string {
  return tab === 'needs_action' ? 'createdAt' : '-updatedAt'
}
