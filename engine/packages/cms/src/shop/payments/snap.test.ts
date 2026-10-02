/**
 * The Snap adapter against a fake `fetch` (no network, no key): the request Midtrans gets — auth,
 * the order's own amounts summing to gross_amount, QRIS/VA/card, the expiry ending at the window —
 * and how status answers are read and verified.
 */
import { describe, expect, it } from 'vitest'

import { SANDBOX, statusOf } from './payments.test-support'
import { paymentItems, type PaymentRequest } from './provider'
import { midtransSignature } from './signature'
import { SNAP_PAYMENT_METHODS, midtransTime, snapBody, snapProvider, type Fetch } from './snap'

const NOW = new Date('2026-10-03T04:00:00Z')
const order = {
  lines: [
    { sku: 'OEI-MUG', name: 'Indigo mug', variantLabel: null, unitPrice: 95000, qty: 2 },
    {
      sku: 'OEI-TOTE-L',
      name: 'Batik tote bag with a very long product name indeed',
      variantLabel: 'Large',
      unitPrice: 50000,
      qty: 1,
    },
  ],
  totals: { subtotal: 240000, discount: 24000, deliveryFee: 15000, total: 231000 },
}
const request: PaymentRequest = {
  midtransOrderId: '1001-1',
  grossAmount: 231000,
  items: paymentItems(order),
  customer: { name: 'Buyer', email: 'b@example.test', phone: '+6281234567890' },
  expiresAt: new Date('2026-10-03T04:59:30Z'),
  now: NOW,
  finishUrl: 'https://shop.localhost/track/abc',
}

function fakeFetch(answer: { status: number; body: unknown }) {
  const calls: Array<{ url: string; init: RequestInit }> = []
  const fetchImpl: Fetch = async (url, init) => {
    calls.push({ url, init })
    return new Response(JSON.stringify(answer.body), { status: answer.status })
  }
  return { calls, fetchImpl }
}

describe('Midtrans items', () => {
  it('are the stored lines, the discount as one negative item and the fee as one, summing to the total', () => {
    const items = paymentItems(order)
    expect(items.map((i) => [i.id, i.price, i.quantity])).toEqual([
      ['OEI-MUG', 95000, 2],
      ['OEI-TOTE-L', 50000, 1],
      ['DISCOUNT', -24000, 1],
      ['DELIVERY', 15000, 1],
    ])
    expect(items.every((i) => [...i.name].length <= 50)).toBe(true)
    expect(items.reduce((sum, i) => sum + i.price * i.quantity, 0)).toBe(231000)
  })

  it('are refused when the stored figures do not add up', () => {
    expect(() => paymentItems({ ...order, totals: { ...order.totals, total: 231001 } })).toThrow(
      /sum/,
    )
  })
})

describe('the Snap request', () => {
  it('opens QRIS, VAs and cards with 3-D Secure, expiring no later than the window', () => {
    const body = snapBody(request)
    expect(body.transaction_details).toEqual({ order_id: '1001-1', gross_amount: 231000 })
    expect(body.enabled_payments).toEqual([...SNAP_PAYMENT_METHODS])
    expect(body.enabled_payments).toEqual(
      expect.arrayContaining(['other_qris', 'bca_va', 'credit_card']),
    )
    expect(body.credit_card).toEqual({ secure: true })
    // 59.5 minutes left → 59 whole minutes: Midtrans stops before we stop holding the stock.
    expect(body.expiry).toEqual({
      start_time: '2026-10-03 04:00:00 +0000',
      unit: 'minute',
      duration: 59,
    })
    expect(body.callbacks).toEqual({ finish: 'https://shop.localhost/track/abc' })
    expect(midtransTime(NOW)).toBe('2026-10-03 04:00:00 +0000')
  })

  it('refuses to open an attempt with less than a minute left', () => {
    expect(() => snapBody({ ...request, expiresAt: new Date(NOW.getTime() + 59_000) })).toThrow()
  })

  it('posts to the sandbox with the server key as Basic auth and answers the token', async () => {
    const { calls, fetchImpl } = fakeFetch({
      status: 201,
      body: {
        token: 'tok-1',
        redirect_url: 'https://app.sandbox.midtrans.com/snap/v4/redirection/tok-1',
      },
    })
    const created = await snapProvider(SANDBOX, fetchImpl).createPayment(request)
    expect(created).toEqual({
      token: 'tok-1',
      redirectUrl: 'https://app.sandbox.midtrans.com/snap/v4/redirection/tok-1',
    })
    expect(calls[0]!.url).toBe('https://app.sandbox.midtrans.com/snap/v1/transactions')
    const headers = calls[0]!.init.headers as Record<string, string>
    expect(headers.Authorization).toBe(
      `Basic ${Buffer.from(`${SANDBOX.serverKey}:`).toString('base64')}`,
    )
    expect(JSON.parse(String(calls[0]!.init.body)).transaction_details.gross_amount).toBe(231000)
  })

  it('throws when Snap refuses', async () => {
    const { fetchImpl } = fakeFetch({
      status: 400,
      body: { error_messages: ['gross_amount mismatch'] },
    })
    await expect(snapProvider(SANDBOX, fetchImpl).createPayment(request)).rejects.toThrow(
      /mismatch/,
    )
  })
})

describe('the status API', () => {
  const signed = (overrides: Record<string, string> = {}) => {
    const answer: Record<string, string> = {
      order_id: '1001-1',
      status_code: '200',
      gross_amount: '205000.00',
      transaction_status: 'settlement',
      transaction_id: statusOf().transactionId!,
      fraud_status: 'accept',
      payment_type: 'qris',
      ...overrides,
    }
    answer.signature_key ??= midtransSignature(
      {
        orderId: answer.order_id!,
        statusCode: answer.status_code!,
        grossAmount: answer.gross_amount!,
      },
      SANDBOX.serverKey,
    )
    return answer
  }

  it('reads a signed answer', async () => {
    const { calls, fetchImpl } = fakeFetch({ status: 200, body: signed() })
    const answer = await snapProvider(SANDBOX, fetchImpl).getStatus('1001-1')
    expect(answer).toMatchObject({ found: true, status: statusOf() })
    expect(calls[0]!.url).toBe('https://api.sandbox.midtrans.com/v2/1001-1/status')
  })

  it('answers not found for a transaction Midtrans does not have yet', async () => {
    for (const fake of [
      fakeFetch({ status: 404, body: { status_code: '404' } }),
      fakeFetch({
        status: 200,
        body: { status_code: '404', status_message: "Transaction doesn't exist." },
      }),
    ]) {
      expect(await snapProvider(SANDBOX, fake.fetchImpl).getStatus('1001-1')).toEqual({
        found: false,
      })
    }
  })

  it('throws on an answer that is not Midtrans’s, for another order, or a server error', async () => {
    const forged = fakeFetch({ status: 200, body: signed({ signature_key: 'b'.repeat(128) }) })
    await expect(snapProvider(SANDBOX, forged.fetchImpl).getStatus('1001-1')).rejects.toThrow(
      /not signed/,
    )
    const other = fakeFetch({ status: 200, body: signed({ order_id: '1001-2' }) })
    await expect(snapProvider(SANDBOX, other.fetchImpl).getStatus('1001-1')).rejects.toThrow(
      /malformed/,
    )
    const down = fakeFetch({ status: 500, body: {} })
    await expect(snapProvider(SANDBOX, down.fetchImpl).getStatus('1001-1')).rejects.toThrow(/500/)
  })
})
