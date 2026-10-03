/**
 * The variant picker's stock states (6.1.b): an unavailable product shows "Out of stock" and
 * offers no add button, a sold-out option stays visible marked "Sold out" — never a silent grey
 * — and an available one offers "Add to bag".
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { VariantPicker, type PickerVariant } from './variant-picker'

const available: PickerVariant = {
  sku: 'OEI-A3',
  label: 'A3',
  price: 150000,
  priceText: 'Rp 150.000',
  available: true,
}
const soldOut: PickerVariant = {
  sku: 'OEI-A4',
  label: 'A4',
  price: 200000,
  priceText: 'Rp 200.000',
  available: false,
}

const render = (variants: readonly PickerVariant[], productAvailable: boolean) =>
  renderToStaticMarkup(
    <VariantPicker
      sku="OEI-TEST"
      locale="en"
      variants={variants}
      productPriceText="Rp 150.000"
      available={productAvailable}
    />,
  )

describe('the variant picker', () => {
  it('the product page shows Out of stock and no add button for an unavailable product', () => {
    const markup = render([available], false)
    expect(markup).toContain('Out of stock')
    expect(markup).not.toContain('Add to bag')
    expect(markup).toContain('disabled')
  })

  it('a sold-out option stays visible, marked "Sold out", and cannot be chosen', () => {
    const markup = render([available, soldOut], true)
    expect(markup).toContain('Sold out')
    expect(markup).toContain('disabled')
    // Two radios: the sold-out option is still there, disabled.
    expect(markup.match(/type="radio"/g)?.length).toBe(2)
  })

  it('an available product offers Add to bag and its chosen price', () => {
    const markup = render([available], true)
    expect(markup).toContain('Add to bag')
    expect(markup).toContain('Rp 150.000')
    expect(markup).toContain('In stock')
  })
})
