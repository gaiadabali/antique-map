/**
 * `quoteReadyEmail` (6-followup-2 A.3): the delivery fee shows as its own line, and the three
 * amounts in the email add up to the order's stored total, in both languages.
 */
import { describe, expect, it } from 'vitest'

import { quoteReadyEmail } from './templates'

const BASE = {
  to: 'buyer@example.test',
  orderNumber: 100011,
  itemsTotalIdr: 95_000,
  deliveryFeeIdr: 15_000,
  totalIdr: 110_000,
  payBy: null,
  payUrl: 'https://shop.example.test/order/abc',
} as const

function rupiah(amountIdr: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amountIdr)
}

describe('quoteReadyEmail', () => {
  it('shows items, delivery fee and total as three separate lines, in English', () => {
    const email = quoteReadyEmail({ ...BASE, locale: 'en' })
    expect(email.text).toContain(`Items: ${rupiah(BASE.itemsTotalIdr)}`)
    expect(email.text).toContain(`Delivery: ${rupiah(BASE.deliveryFeeIdr)}`)
    expect(email.text).toContain(`Total: ${rupiah(BASE.totalIdr)}`)
    expect(email.html).toContain(`Delivery: ${rupiah(BASE.deliveryFeeIdr)}`)
  })

  it('shows items, delivery fee and total as three separate lines, in Indonesian', () => {
    const email = quoteReadyEmail({ ...BASE, locale: 'id' })
    expect(email.text).toContain(`Barang: ${rupiah(BASE.itemsTotalIdr)}`)
    expect(email.text).toContain(`Pengiriman: ${rupiah(BASE.deliveryFeeIdr)}`)
    expect(email.text).toContain(`Total: ${rupiah(BASE.totalIdr)}`)
  })

  it('the fee appears as its own line, distinct from items and total', () => {
    const email = quoteReadyEmail({ ...BASE, locale: 'en' })
    const feeLine = email.text.split('\n').find((row) => row.startsWith('Delivery:'))
    expect(feeLine).toBe(`Delivery: ${rupiah(BASE.deliveryFeeIdr)}`)
  })

  it('the three amounts add up to the stored total', () => {
    expect(BASE.itemsTotalIdr + BASE.deliveryFeeIdr).toBe(BASE.totalIdr)
  })
})
