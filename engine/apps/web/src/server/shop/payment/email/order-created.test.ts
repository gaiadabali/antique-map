/**
 * The order-created email (6.5.b), with a fake `payload`: the stored totals, never a re-price;
 * the tracking link, and the token nowhere else; both languages render every key.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { sendOrderCreatedEmail } from './order-created'
import { formatRupiah } from '../../../../shared/ui/price/format-rupiah'

const ORDER_DOC = {
  number: 104,
  contact: { name: 'Made Buyer', email: 'made@example.test' },
  expiresAt: '2026-10-05T10:00:00.000Z',
  totals: { subtotal: 200_000, discount: 20_000, deliveryFee: 15_000, total: 195_000 },
  lines: [{ name: 'Scarf', variantLabel: 'Blue', qty: 2, lineTotal: 190_000 }],
}

type SentEmail = { to: string; subject: string; text: string; html: string }

function fakePayload(order: unknown = ORDER_DOC) {
  const sendEmail = vi.fn<(args: SentEmail) => Promise<void>>().mockResolvedValue(undefined)
  const findByID = vi.fn().mockResolvedValue(order)
  return { payload: { findByID, sendEmail } as never, sendEmail, findByID }
}

function sentOf(
  sendEmail: ReturnType<typeof vi.fn<(args: SentEmail) => Promise<void>>>,
): SentEmail {
  const [call] = sendEmail.mock.calls.at(-1) ?? []
  if (!call) throw new Error('sendEmail was never called')
  return call
}

const TOKEN = 'super-secret-tracking-token'
const INPUT = {
  orderId: 1,
  trackingToken: TOKEN,
  locale: 'en' as const,
  origin: 'https://oldeastindies.test',
}

describe('sendOrderCreatedEmail', () => {
  it('states the stored totals, not a re-price', async () => {
    const { payload, sendEmail } = fakePayload()
    const result = await sendOrderCreatedEmail(payload, INPUT)
    expect(result.ok).toBe(true)
    const call = sentOf(sendEmail)
    expect(call.text).toContain(formatRupiah(195_000))
    expect(call.text).not.toContain(formatRupiah(200_000)) // the subtotal: never shown as due
  })

  it('carries the tracking link and the token appears nowhere else in logs', async () => {
    const { payload, sendEmail } = fakePayload()
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await sendOrderCreatedEmail(payload, INPUT)
    expect(result.ok).toBe(true)
    const call = sentOf(sendEmail)
    expect(call.text).toContain(`/track/${TOKEN}`)
    expect(call.html).toContain(`/track/${TOKEN}`)
    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
  })

  it('both languages render every key — no unfilled {placeholder} is left', async () => {
    for (const locale of ['en', 'id'] as const) {
      const { payload, sendEmail } = fakePayload()
      await sendOrderCreatedEmail(payload, { ...INPUT, locale })
      const call = sentOf(sendEmail)
      expect(call.subject).toContain('104')
      expect(call.subject).not.toMatch(/\{\w+\}/)
      expect(call.text).not.toMatch(/\{\w+\}/)
      expect(call.html).not.toMatch(/\{\w+\}/)
      expect(call.html).toContain('<ul>')
    }
  })

  it('answers ok:false, never throws, for a missing order', async () => {
    const { payload } = fakePayload(null)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await sendOrderCreatedEmail(payload, INPUT)
    expect(result.ok).toBe(false)
    errors.mockRestore()
  })

  it('answers ok:false for an order with no contact email', async () => {
    const { payload } = fakePayload({ ...ORDER_DOC, contact: { name: 'Made', email: null } })
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await sendOrderCreatedEmail(payload, INPUT)
    expect(result.ok).toBe(false)
    errors.mockRestore()
  })

  it('never throws when sendEmail itself fails', async () => {
    const sendEmail = vi.fn().mockRejectedValue(new Error('smtp down'))
    const findByID = vi.fn().mockResolvedValue(ORDER_DOC)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await sendOrderCreatedEmail({ findByID, sendEmail } as never, INPUT)
    expect(result.ok).toBe(false)
    errors.mockRestore()
  })
})
