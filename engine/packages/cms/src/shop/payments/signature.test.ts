/**
 * The Midtrans signature (SECURITY.md W1): SHA-512 of order_id + status_code + gross_amount + the
 * server key, over the strings as sent; a change to any of the four fails it.
 */
import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { isValidSignature, midtransSignature } from './signature'

const KEY = 'SB-Mid-server-TEST0000000000000000'
const fields = { orderId: '1001-1', statusCode: '200', grossAmount: '205000.00' }

describe('the Midtrans notification signature', () => {
  it('is the SHA-512 hex of the three fields as sent, then the server key', () => {
    const independent = createHash('sha512').update(`1001-1200205000.00${KEY}`).digest('hex')
    expect(midtransSignature(fields, KEY)).toBe(independent)
    expect(independent).toMatch(/^[0-9a-f]{128}$/)
  })

  it('accepts the right signature, in either case', () => {
    const signature = midtransSignature(fields, KEY)
    expect(isValidSignature(fields, signature, KEY)).toBe(true)
    expect(isValidSignature(fields, signature.toUpperCase(), KEY)).toBe(true)
  })

  it('refuses a signature when any signed field, or the key, differs', () => {
    const signature = midtransSignature(fields, KEY)
    for (const changed of [
      { ...fields, orderId: '1001-2' },
      { ...fields, statusCode: '201' },
      { ...fields, grossAmount: '1.00' },
      // The amount is signed as text: "205000" is not "205000.00".
      { ...fields, grossAmount: '205000' },
    ]) {
      expect(isValidSignature(changed, signature, KEY), JSON.stringify(changed)).toBe(false)
    }
    expect(isValidSignature(fields, signature, `${KEY}x`)).toBe(false)
    expect(isValidSignature(fields, '', KEY)).toBe(false)
    expect(isValidSignature(fields, signature.slice(0, 127), KEY)).toBe(false)
  })
})
