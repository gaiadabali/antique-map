/**
 * The checkout's refusal words (TASKS.md 6.3.a): every refusal of the merged core maps to one
 * lexicon key that exists in both locales, and the named-lines refusals name the items the buyer
 * can act on — never ids, never a store's stock.
 */
import { describe, expect, it } from 'vitest'

import type { LineRef } from '@engine/cms/shop/orders'

import { formatRupiah } from '../../../shared/ui/price/format-rupiah'
import { checkoutText } from '../../../sites/shop/checkout/copy'
import { discountKey, itemNames, refusalCopy } from './refusal-text'

const t = checkoutText('en')
const id = checkoutText('id')
const nameOf = (line: LineRef) => (line.productId === 7 ? 'Batik wall print' : null)

/** Every mapped refusal renders a real sentence in both locales — the key is never raw. */
function renders(copy: ReturnType<typeof refusalCopy>): boolean {
  const en = copy.params === undefined ? t(copy.key) : t(copy.key, copy.params)
  const idText = copy.params === undefined ? id(copy.key) : id(copy.key, copy.params)
  return en.length > 0 && idText.length > 0 && !en.startsWith('checkout.') && !en.startsWith('bag.')
}

describe('refusalCopy', () => {
  it('invalid_details asks to check the fields', () => {
    const copy = refusalCopy(
      { ok: false, refusal: 'invalid_details', fields: ['contact.name'] },
      nameOf,
    )
    expect(copy.key).toBe('checkout.problem.invalid-details')
    expect(renders(copy)).toBe(true)
  })

  it('the pin and reach refusals each have their own words', () => {
    expect(refusalCopy({ ok: false, refusal: 'invalid_pin' }, nameOf).key).toBe(
      'checkout.problem.invalid-pin',
    )
    expect(refusalCopy({ ok: false, refusal: 'outside_indonesia' }, nameOf).key).toBe(
      'checkout.problem.outside-indonesia',
    )
    expect(refusalCopy({ ok: false, refusal: 'checkout_disabled' }, nameOf).key).toBe(
      'checkout.problem.checkout-disabled',
    )
    expect(refusalCopy({ ok: false, refusal: 'empty_bag' }, nameOf).key).toBe('cart.empty')
    expect(
      refusalCopy(
        {
          ok: false,
          refusal: 'price_changed',
          totals: { subtotalIdr: 1, discountIdr: 0, deliveryIdr: 0, totalIdr: 1 },
        },
        nameOf,
      ).key,
    ).toBe('checkout.problem.price-changed')
    expect(refusalCopy({ ok: false, refusal: 'busy' }, nameOf).key).toBe('checkout.problem.busy')
  })

  it('out_of_stock names the items the buyer can act on', () => {
    const copy = refusalCopy(
      { ok: false, refusal: 'out_of_stock', lines: [{ productId: 7, variantSku: null }] },
      nameOf,
    )
    expect(copy.key).toBe('checkout.problem.out-of-stock')
    expect(copy.params?.items).toBe('Batik wall print')
    expect(renders(copy)).toBe(true)
  })

  it('a line the shop cannot name is "an item", never an id', () => {
    const copy = refusalCopy(
      { ok: false, refusal: 'no_single_store', missing: [{ productId: 3, variantSku: null }] },
      nameOf,
    )
    expect(copy.key).toBe('checkout.problem.no-single-store')
    expect(copy.params?.items).toBe('an item')
    expect(itemNames([{ productId: 3, variantSku: null }], nameOf)).toBe('an item')
    expect(renders(copy)).toBe(true)
  })

  it('a refused code borrows the bag page’s words for the same reason', () => {
    expect(discountKey('already_used')).toBe('codeInvalid.already-used')
    const copy = refusalCopy(
      {
        ok: false,
        refusal: 'code_refused',
        code: {
          reason: 'minimum_spend',
          messageKey: 'codeInvalid.minimum-spend',
          amountIdr: 50000,
        },
      },
      nameOf,
    )
    expect(copy.key).toBe('codeInvalid.minimum-spend')
    expect(copy.params?.amount).toBe(formatRupiah(50000))
    expect(renders(copy)).toBe(true)
  })
})
