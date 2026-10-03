// Who may move an order where (COMMERCE.md §7; TASKS.md 3.5.c), every pair of statuses for each
// role: store staff one step forward along the paid line; the owner and editors any step forward,
// one step back, a cancel before delivery; nothing out of a closed status but delivered's one
// step back; on the way only with the driver's details in.
import { describe, expect, it } from 'vitest'

import { ORDER_STATUSES, type OrderStatus } from './statuses'
import { FORWARD_LINE, statusMoveRefusal } from './status-moves'

const pairs = ORDER_STATUSES.flatMap((from) => ORDER_STATUSES.map((to) => [from, to] as const))
const allowed = (role: 'owner' | 'editor' | 'store', image = true) =>
  pairs
    .filter(([from, to]) => from !== to && statusMoveRefusal(role, from, to, image) === null)
    .map(([from, to]) => `${from}>${to}`)

describe('statusMoveRefusal', () => {
  it('lets store staff move one step forward along the paid line, and nothing else', () => {
    expect(allowed('store')).toEqual([
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
      for (const from of ['pending_payment', 'paid', 'on_the_way'] as OrderStatus[]) {
        expect(moves).toContain(`${from}>cancelled`)
      }
      expect(moves).not.toContain('delivered>cancelled')
      // Payment is Midtrans's and the sweep's; nothing leaves cancelled or expired.
      expect(moves).not.toContain('pending_payment>paid')
      expect(moves).not.toContain('pending_payment>expired')
      expect(moves.filter((m) => m.startsWith('cancelled>') || m.startsWith('expired>'))).toEqual(
        [],
      )
    }
  })

  it('refuses on the way until the driver’s details are uploaded, for every role', () => {
    for (const role of ['owner', 'editor', 'store'] as const) {
      expect(statusMoveRefusal(role, 'waiting_driver', 'on_the_way', false), role).toMatch(
        /Upload the driver’s details/,
      )
    }
    // Stepping back to it corrects a mistake: the details were needed on the way forward.
    expect(statusMoveRefusal('editor', 'delivered', 'on_the_way', false)).toBeNull()
  })

  it('says what to do instead, in plain words', () => {
    expect(statusMoveRefusal('store', 'paid', 'waiting_driver', true)).toBe(
      'Store staff move an order one step forward only: from “Paid” the next step is “Processing”. Hand it back with a reason if something is wrong.',
    )
    expect(statusMoveRefusal('store', 'processing', 'paid', true)).toMatch(
      /^Store staff move an order one step forward only/,
    )
    expect(statusMoveRefusal('store', 'delivered', 'cancelled', true)).toMatch(
      /^Store staff cannot move this order from “Delivered” to “Cancelled”/,
    )
    expect(statusMoveRefusal('editor', 'cancelled', 'paid', true)).toBe(
      'An order cannot move from “Cancelled” to “Paid”. Move it forward, or one step back to correct a mistake.',
    )
    expect(statusMoveRefusal('owner', 'delivered', 'cancelled', true)).toBe(
      'An order that is “Delivered” cannot be cancelled.',
    )
    expect(statusMoveRefusal(null, 'paid', 'processing', true)).toBe('Only staff move an order.')
  })

  it('never refuses staying put', () => {
    for (const status of ORDER_STATUSES) {
      expect(statusMoveRefusal('store', status, status, false)).toBeNull()
    }
  })
})
