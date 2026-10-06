// Who may move an order where (COMMERCE.md §7; TASKS.md 3.5.c), every pair of statuses for each
// role: store staff one step forward along the paid line; the owner and editors any step forward,
// one step back, a cancel before delivery; nothing out of a closed status but delivered's one
// step back; on the way only with the driver's details in.
import { describe, expect, it } from 'vitest'

import { ORDER_STATUSES, type OrderStatus } from './statuses'
import { FORWARD_LINE, statusMoveRefusal, statusMoveRefusalBilingual } from './status-moves'

const pairs = ORDER_STATUSES.flatMap((from) => ORDER_STATUSES.map((to) => [from, to] as const))
const allowed = (role: 'owner' | 'editor' | 'store', image = true) =>
  pairs
    .filter(
      ([from, to]) => from !== to && statusMoveRefusalBilingual(role, from, to, image) === null,
    )
    .map(([from, to]) => `${from}>${to}`)

describe('statusMoveRefusal', () => {
  it('lets store staff move one step forward along the paid line, plus awaiting_quote>cancelled, and nothing else', () => {
    expect(allowed('store')).toEqual([
      'awaiting_quote>cancelled',
      'paid>processing',
      'processing>waiting_driver',
      'waiting_driver>on_the_way',
      'on_the_way>delivered',
    ])
  })

  it('lets the owner and editors move forward, one step back, and cancel before delivery', () => {
    for (const role of ['owner', 'editor'] as const) {
      const moves = allowed(role)
      // Forward, any distance.
      for (let a = 0; a < FORWARD_LINE.length; a += 1) {
        for (let b = a + 1; b < FORWARD_LINE.length; b += 1) {
          expect(moves, role).toContain(`${FORWARD_LINE[a]}>${FORWARD_LINE[b]}`)
        }
      }
      // One step back only — delivered's included.
      expect(moves).toContain('delivered>on_the_way')
      expect(moves).toContain('processing>paid')
      expect(moves).not.toContain('delivered>waiting_driver')
      expect(moves).not.toContain('paid>pending_payment')
      // A cancel before delivery, never after.
      for (const from of [
        'awaiting_quote',
        'pending_payment',
        'paid',
        'on_the_way',
      ] as OrderStatus[]) {
        expect(moves).toContain(`${from}>cancelled`)
      }
      expect(moves).not.toContain('delivered>cancelled')
      // Payment is Midtrans's and the sweep's; the quote move is quoteDeliveryFee's; nothing
      // leaves cancelled, expired or awaiting_quote through a staff status write.
      expect(moves).not.toContain('pending_payment>paid')
      expect(moves).not.toContain('pending_payment>expired')
      expect(moves).not.toContain('awaiting_quote>pending_payment')
      expect(moves.filter((m) => m.startsWith('cancelled>') || m.startsWith('expired>'))).toEqual(
        [],
      )
      expect(moves.filter((m) => m.startsWith('awaiting_quote>'))).toEqual([
        'awaiting_quote>cancelled',
      ])
    }
  })

  it('refuses on the way until the driver’s details are uploaded, for every role', () => {
    for (const role of ['owner', 'editor', 'store'] as const) {
      const refusal = statusMoveRefusalBilingual(role, 'waiting_driver', 'on_the_way', false)
      expect(refusal?.en, role).toMatch(/Upload the driver’s details/)
      expect(refusal?.id, role).toMatch(/Unggah data pengemudi/)
    }
    // Stepping back to it corrects a mistake: the details were needed on the way forward.
    expect(statusMoveRefusalBilingual('editor', 'delivered', 'on_the_way', false)).toBeNull()
  })

  it('says what to do instead, in plain words, in both admin languages', () => {
    expect(statusMoveRefusalBilingual('store', 'paid', 'waiting_driver', true)).toEqual({
      en: 'Store staff move an order one step forward only: from “Paid” the next step is “Processing”. Hand it back with a reason if something is wrong.',
      id: 'Staf toko hanya memindahkan pesanan satu langkah maju: dari “Dibayar” langkah berikutnya adalah “Diproses”. Kembalikan dengan alasan jika ada yang salah.',
    })
    expect(statusMoveRefusalBilingual('store', 'processing', 'paid', true)?.en).toMatch(
      /^Store staff move an order one step forward only/,
    )
    expect(statusMoveRefusalBilingual('store', 'delivered', 'cancelled', true)?.en).toMatch(
      /^Store staff cannot move this order from “Delivered” to “Cancelled”/,
    )
    expect(statusMoveRefusalBilingual('editor', 'cancelled', 'paid', true)).toEqual({
      en: 'An order cannot move from “Cancelled” to “Paid”. Move it forward, or one step back to correct a mistake.',
      id: 'Pesanan tidak dapat dipindahkan dari “Dibatalkan” ke “Dibayar”. Pindahkan maju, atau satu langkah mundur untuk memperbaiki kesalahan.',
    })
    expect(statusMoveRefusalBilingual('owner', 'delivered', 'cancelled', true)).toEqual({
      en: 'An order that is “Delivered” cannot be cancelled.',
      id: 'Pesanan yang berstatus “Terkirim” tidak dapat dibatalkan.',
    })
    expect(statusMoveRefusalBilingual(null, 'paid', 'processing', true)).toEqual({
      en: 'Only staff move an order.',
      id: 'Hanya staf yang dapat memindahkan pesanan.',
    })
  })

  it('names both languages, non-empty, for every refusal kind', () => {
    for (const [from, to] of pairs) {
      const refusal = statusMoveRefusalBilingual('store', from, to, true)
      if (refusal === null) continue
      expect(refusal.en.length, `${from}>${to} en`).toBeGreaterThan(0)
      expect(refusal.id.length, `${from}>${to} id`).toBeGreaterThan(0)
      expect(refusal.en).not.toEqual(refusal.id)
    }
  })

  it('never refuses staying put', () => {
    for (const status of ORDER_STATUSES) {
      expect(statusMoveRefusal('store', status, status, false)).toBeNull()
    }
  })
})
