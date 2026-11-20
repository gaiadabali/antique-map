/**
 * The pay button's `expectedTotalIdr` (the plan's K2, TASKS.md 27.3): before a pin is quoted it is
 * the review's items total; after a `price_changed` refusal it is the server's total the message
 * names, so the next press of Pay goes through even when the delivery preview never arrived.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../server/shop/checkout/actions', () => ({ submitOrderAction: vi.fn() }))
vi.mock('../../../server/shop/checkout/quote-action', () => ({ quoteDeliveryAction: vi.fn() }))

import type { SubmitState } from '../../../server/shop/checkout/actions'
import { CheckoutForm, type CheckoutFormLabels } from './checkout-form'

const labels = new Proxy({} as CheckoutFormLabels, {
  get: (_target, name) =>
    name === 'preview' ? new Proxy({}, { get: (_t, inner) => String(inner) }) : String(name),
})

const totalIn = (html: string): string | undefined =>
  /name="expectedTotalIdr" value="(\d+)"/.exec(html)?.[1]

const render = (initialState: SubmitState | null) =>
  renderToStaticMarkup(
    <CheckoutForm
      locale="en"
      labels={labels}
      browserKey={null}
      expectedTotalIdr={95000}
      initialState={initialState}
    />,
  )

const refused = (extra: Partial<SubmitState>): SubmitState => ({
  ok: false,
  message: 'The total changed since you last saw it: it’s now Rp 110.000.',
  fields: [],
  values: {
    name: 'Ayu',
    whatsapp: '+6281234567890',
    email: 'ayu@example.test',
    address: 'Jl. Raya Ubud 1',
    notes: '',
    giftNote: '',
    lat: -8.5069,
    lng: 115.2625,
  },
  ...extra,
})

describe('the total the pay button echoes', () => {
  it('is the items total before any pin is quoted', () => {
    expect(totalIn(render(null))).toBe('95000')
  })

  it('is the server’s total after price_changed, with the message naming it', () => {
    const html = render(refused({ expectedTotalIdr: 110000 }))
    expect(totalIn(html)).toBe('110000')
    expect(html).toContain('Rp 110.000')
  })

  it('stays the shown total after a refusal that names no total', () => {
    expect(totalIn(render(refused({ message: 'Check your details.' })))).toBe('95000')
  })
})
