/**
 * The stores' emails (TASKS.md 6.6, 7.1.c, 7.3.b): to every user of the sending store on a newly
 * paid order, and of the store an order is moved to. Staff read both languages, so the opening is
 * sent in English and in Indonesian; the subject is the English one. Both come from the owner's
 * settings (`site-settings.shop.emails.storeNewOrder` / `storeReassigned`, TASKS.md 27.3.d), passed
 * in filled (`./wording`); left out, the defaults. The order's lines, total and admin link follow.
 */
import { render, rupiahOf } from './render'
import type { MailMessage } from './transport'
import { wordingFor, type Lang, type Wording } from './wording'

export type StoreNewOrderEmailInput = {
  readonly to: string
  readonly orderNumber: number
  readonly storeName: string
  readonly itemSummary: string
  readonly totalIdr: number
  readonly adminUrl: string
  /** The owner's wording in each language, filled; the defaults when left out. */
  readonly wording?: Record<Lang, Wording>
}

export type StoreReassignedEmailInput = StoreNewOrderEmailInput

function storeEmail(input: StoreNewOrderEmailInput, wording: Record<Lang, Wording>): MailMessage {
  return render(input.to, wording.en.subject, [
    wording.en.opening,
    wording.id.opening,
    '',
    `Items / Barang: ${input.itemSummary}`,
    `Total: ${rupiahOf(input.totalIdr)}`,
    '',
    { label: 'Open it in the admin / Buka di admin:', url: input.adminUrl },
  ])
}

const both = (
  key: 'storeNewOrder' | 'storeReassigned',
  input: StoreNewOrderEmailInput,
): Record<Lang, Wording> => {
  const vars = { number: input.orderNumber, store: input.storeName }
  return { en: wordingFor({}, key, 'en', vars), id: wordingFor({}, key, 'id', vars) }
}

/** One store user's email on a newly paid order assigned to their store. */
export function storeNewOrderEmail(input: StoreNewOrderEmailInput): MailMessage {
  return storeEmail(input, input.wording ?? both('storeNewOrder', input))
}

/** One store user's email when an order is reassigned to their store. */
export function storeReassignedEmail(input: StoreReassignedEmailInput): MailMessage {
  return storeEmail(input, input.wording ?? both('storeReassigned', input))
}
