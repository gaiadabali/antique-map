/**
 * The product page's fixed words (TASKS.md 27.5.c): the owner's from the settings, the lexicon's
 * for a field left empty, and `{freeOver}` filled with the free-delivery amount in rupiah — the one
 * figure, set once, with nothing hard-coded left.
 */
import { describe, expect, it } from 'vitest'

import { productText } from './copy'
import { deliveryLine, productPageCopy } from './page-copy'

const RP = (text: string) => text.replace(/\s/g, ' ')

describe('the delivery line', () => {
  it('fills {freeOver} with the amount, formatted as rupiah', () => {
    expect(RP(deliveryLine('Free over {freeOver}.', 500_000))).toBe('Free over Rp 500.000.')
    expect(RP(deliveryLine('Gratis di atas {freeOver}.', 1_250_000))).toBe(
      'Gratis di atas Rp 1.250.000.',
    )
  })

  it('leaves out the clause that names the amount when none is set', () => {
    const line =
      'Sent from the nearest store by Gojek or Grab. The fee shows at checkout once you drop a pin — free over {freeOver}.'
    expect(deliveryLine(line, null)).toBe(
      'Sent from the nearest store by Gojek or Grab. The fee shows at checkout once you drop a pin.',
    )
    expect(deliveryLine('Free over {freeOver} today', 0)).not.toContain('{freeOver}')
  })

  it('keeps a line without the placeholder as the owner wrote it', () => {
    expect(deliveryLine('Delivered across Bali.', 500_000)).toBe('Delivered across Bali.')
  })
})

describe('the product page’s words', () => {
  it('are the lexicon’s, with the figure from the settings, while the settings are empty', () => {
    for (const locale of ['en', 'id'] as const) {
      const copy = productPageCopy(productText(locale), null, 750_000)
      expect(RP(copy.delivery)).toContain('Rp 750.000')
      expect(copy.delivery).not.toMatch(/500\.000|\{freeOver\}/)
      expect(copy).not.toHaveProperty('signals')
      expect(copy.finishHelp.label).not.toBe('')
    }
  })

  it('are the owner’s where set, field by field', () => {
    const copy = productPageCopy(
      productText('en'),
      {
        deliveryLine: 'Free delivery over {freeOver} in Bali.',
        finishHelpLabel: null,
        finishHelp: 'Mounted means on board.',
      },
      300_000,
    )
    expect(RP(copy.delivery)).toBe('Free delivery over Rp 300.000 in Bali.')
    expect(copy.finishHelp).toEqual({
      label: productText('en')('product.finishHelpLabel'),
      text: 'Mounted means on board.',
    })
  })
})
