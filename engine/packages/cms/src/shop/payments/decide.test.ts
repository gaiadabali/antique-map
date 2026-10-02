/**
 * The status machine a confirmed Midtrans status drives (COMMERCE.md §6–§7, §13): forward only,
 * out of `pending_payment` only, and money where it should not be is flagged, never applied.
 */
import { describe, expect, it } from 'vitest'

import type { OrderStatus } from '../../collections/orders/statuses'
import { decide, type LockedOrder } from './decide'
import { statusOf } from './payments.test-support'

const NOW = new Date('2026-10-03T04:00:00Z')
const order = (overrides: Partial<LockedOrder> = {}): LockedOrder => ({
  id: 7,
  number: 1001,
  status: 'pending_payment',
  total: 205000,
  expiresAt: new Date('2026-10-03T04:30:00Z'),
  paidTransactionId: null,
  ...overrides,
})
const at = (status: OrderStatus, rest: Partial<LockedOrder> = {}) => order({ status, ...rest })

describe('deciding what a confirmed status does', () => {
  it('pays a pending order on settlement, and on a card capture the fraud check accepted', () => {
    expect(decide(order(), statusOf(), NOW)).toMatchObject({
      outcome: 'paid',
      move: 'paid',
      flag: null,
    })
    const capture = statusOf({
      transactionStatus: 'capture',
      fraudStatus: 'accept',
      paymentType: 'credit_card',
    })
    expect(decide(order(), capture, NOW)).toMatchObject({ outcome: 'paid', move: 'paid' })
  })

  it('records an unknown order and moves nothing', () => {
    expect(decide(null, statusOf(), NOW)).toMatchObject({ outcome: 'unknown-order', move: null })
  })

  it('flags an amount that is not the priced total, and does not pay', () => {
    for (const status of [
      statusOf({ grossAmount: 200000, grossAmountText: '200000.00' }),
      statusOf({ grossAmount: null, grossAmountText: '205000.50' }),
    ]) {
      const decision = decide(order(), status, NOW)
      expect(decision).toMatchObject({ outcome: 'amount-mismatch', move: null })
      expect(decision.flag).toMatch(/order total is Rp 205\.000/)
    }
  })

  it('flags a late payment on an expired or cancelled order and leaves it where it is', () => {
    for (const status of ['expired', 'cancelled'] as const) {
      const decision = decide(at(status), statusOf(), NOW)
      expect(decision).toMatchObject({ outcome: 'late-payment', move: null })
      expect(decision.flag).toMatch(new RegExp(`after the order was ${status}`))
    }
  })

  it('changes nothing for the payment it already applied, and flags a second one', () => {
    const paid = at('paid', { paidTransactionId: statusOf().transactionId })
    expect(decide(paid, statusOf(), NOW)).toMatchObject({
      outcome: 'already-applied',
      move: null,
      flag: null,
    })
    const second = statusOf({ midtransOrderId: '1001-2', transactionId: 'another' })
    expect(decide(paid, second, NOW)).toMatchObject({ outcome: 'double-payment', move: null })
    expect(decide(at('delivered', { paidTransactionId: 'x' }), second, NOW).flag).toMatch(
      /second payment/,
    )
  })

  it('records pending, deny and failure without moving the order', () => {
    for (const transactionStatus of ['pending', 'deny', 'failure', 'authorize']) {
      expect(
        decide(order(), statusOf({ transactionStatus }), NOW),
        transactionStatus,
      ).toMatchObject({
        outcome: 'recorded',
        move: null,
        flag: null,
      })
    }
    // A late pending after the payment changes nothing either.
    expect(decide(at('paid'), statusOf({ transactionStatus: 'pending' }), NOW).move).toBeNull()
  })

  it('flags a card capture held by the fraud check', () => {
    const challenge = statusOf({ transactionStatus: 'capture', fraudStatus: 'challenge' })
    expect(decide(order(), challenge, NOW)).toMatchObject({
      outcome: 'fraud-challenge',
      move: null,
    })
    expect(
      decide(order(), statusOf({ transactionStatus: 'capture', fraudStatus: null }), NOW).outcome,
    ).toBe('fraud-challenge')
  })

  it('expires on Midtrans expire or cancel only once the window has closed', () => {
    for (const transactionStatus of ['expire', 'cancel']) {
      const status = statusOf({ transactionStatus, statusCode: '407' })
      expect(decide(order(), status, NOW)).toMatchObject({ outcome: 'attempt-closed', move: null })
      const closed = order({ expiresAt: NOW })
      expect(decide(closed, status, NOW)).toMatchObject({ outcome: 'expired', move: 'expired' })
      expect(decide(at('paid'), status, NOW)).toMatchObject({
        outcome: 'attempt-closed',
        move: null,
      })
    }
  })

  it('notes a refund in the history and changes no status', () => {
    const decision = decide(at('delivered'), statusOf({ transactionStatus: 'refund' }), NOW)
    expect(decision).toMatchObject({ outcome: 'refund-recorded', move: null, flag: null })
    expect(decision.note).toMatch(/refund of Rp 205\.000/)
  })

  it('ignores a status it does not know', () => {
    expect(decide(order(), statusOf({ transactionStatus: 'something_new' }), NOW)).toMatchObject({
      outcome: 'ignored',
      move: null,
    })
  })
})
