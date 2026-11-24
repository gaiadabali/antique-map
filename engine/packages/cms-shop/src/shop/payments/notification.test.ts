/**
 * Reading a notification: only the signed fields before verification; strict shapes after; money
 * as whole rupiah or nothing; attempts as `{number}-{n}`; one dedupe key per transaction state.
 */
import { describe, expect, it } from 'vitest'

import {
  attemptOrderId,
  dedupeKeyOf,
  parseAttemptOrderId,
  parseGrossAmount,
  parseStatus,
  readSignedFields,
} from './notification'
import { statusOf } from './payments.test-support'

const SIG = 'a'.repeat(128)
const body = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    order_id: '1001-1',
    status_code: '200',
    gross_amount: '205000.00',
    signature_key: SIG,
    transaction_status: 'settlement',
    transaction_id: 'b3f1c2d4-0000-4000-8000-000000000001',
    fraud_status: 'accept',
    payment_type: 'qris',
    ...extra,
  })

describe('reading the signed fields', () => {
  it('takes the three signed fields and the signature, as sent', () => {
    const read = readSignedFields(body())
    expect(read).toMatchObject({
      ok: true,
      fields: { orderId: '1001-1', statusCode: '200', grossAmount: '205000.00' },
      signatureKey: SIG,
    })
  })

  it('calls a body that is not a JSON object malformed', () => {
    for (const raw of ['', 'not json', '[1,2]', 'null', '"text"']) {
      expect(readSignedFields(raw), raw).toEqual({ ok: false, reason: 'malformed' })
    }
  })

  it('calls a body without a well-formed signed field unsigned', () => {
    for (const extra of [
      { signature_key: undefined },
      { signature_key: 'xyz' },
      { order_id: 7 },
      { status_code: '2000' },
      { gross_amount: 205000 },
      { gross_amount: '-1.00' },
    ]) {
      expect(readSignedFields(body(extra)), JSON.stringify(extra)).toEqual({
        ok: false,
        reason: 'unsigned',
      })
    }
  })
})

describe('the status', () => {
  it('parses a settlement in whole rupiah', () => {
    const parsed = readSignedFields(body())
    if (!parsed.ok) throw new Error('unreadable')
    expect(parseStatus(parsed.body)).toEqual(statusOf())
  })

  it('refuses a malformed status field rather than guess', () => {
    for (const extra of [
      { transaction_status: 'SETTLEMENT' },
      { transaction_status: undefined },
      { fraud_status: 7 },
      { transaction_id: 'x'.repeat(65) },
      { payment_type: 'qris; drop' },
    ]) {
      const parsed = JSON.parse(body(extra)) as Record<string, unknown>
      expect(parseStatus(parsed), JSON.stringify(extra)).toBeNull()
    }
  })

  it('reads absent optional fields as null', () => {
    const parsed = JSON.parse(body({ fraud_status: undefined, transaction_id: '' })) as Record<
      string,
      unknown
    >
    expect(parseStatus(parsed)).toMatchObject({ fraudStatus: null, transactionId: null })
  })
})

describe('gross_amount', () => {
  it('is whole rupiah with or without .00', () => {
    expect(parseGrossAmount('205000.00')).toBe(205000)
    expect(parseGrossAmount('205000')).toBe(205000)
    expect(parseGrossAmount('0.00')).toBe(0)
  })
  it('is nothing for a fraction, a float, or an unsafe integer', () => {
    for (const value of ['205000.50', '205000.5', '1e5', '', ' 1', '9999999999999999']) {
      expect(parseGrossAmount(value), value).toBeNull()
    }
  })
})

describe('attempts', () => {
  it('are {order number}-{attempt}, both ways', () => {
    expect(attemptOrderId(1001, 2)).toBe('1001-2')
    expect(parseAttemptOrderId('1001-2')).toEqual({ orderNumber: 1001, attempt: 2 })
    for (const id of ['1001', '1001-0', '01001-1', 'OEI-1001-1', '1001-1-1', '-1']) {
      expect(parseAttemptOrderId(id), id).toBeNull()
    }
    expect(() => attemptOrderId(0, 1)).toThrow()
  })
})

describe('the dedupe key', () => {
  it('is the same for a redelivery and different for a new state of the transaction', () => {
    const key = dedupeKeyOf(statusOf())
    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(dedupeKeyOf(statusOf())).toBe(key)
    for (const changed of [
      { transactionStatus: 'pending', statusCode: '201' },
      { transactionId: 'another' },
      { midtransOrderId: '1001-2' },
      { fraudStatus: 'challenge' },
    ]) {
      expect(dedupeKeyOf(statusOf(changed)), JSON.stringify(changed)).not.toBe(key)
    }
  })
})
