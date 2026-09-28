/**
 * @contract C2 — fixture `checkout-id` · owner: ARC
 *
 * An Indonesian destination on the emporium app, at the shipping step: rupiah alone, the
 * WhatsApp number first and confirmed, an address from the sub-district pickers, couriers
 * with price and ETA, same-day delivery, showroom pickup, and the automatic methods routing
 * allows (QRIS, e-wallets, virtual accounts, cards, cash at a convenience store, pay later —
 * this bag holds no unique item). No lock yet: it is taken at the payment step.
 */
import type { CheckoutLineVM, CheckoutVM } from '../surfaces/checkout'
import { SHOWROOM, token, totals } from './_commerce'
import { cart } from './cart'
import { money, SELLER_ID, seo } from './_shared'

const lines: readonly CheckoutLineVM[] = cart.lines.map(
  ({ intents: _intents, remedy: _remedy, maxQuantity: _max, ...line }) => line,
)
const rate = (optionId: string, carrier: string, service: string, amount: number) => ({
  optionId,
  kind: 'rate' as const,
  carrier,
  service,
  price: money(amount, 'IDR'),
  isEstimate: false,
  cover: 'courier' as const,
  duties: null,
})
const midtrans = (method: CheckoutVM['payment']['options'][number]['method']) => ({
  method,
  provider: 'midtrans' as const,
  confirmation: 'automatic' as const,
  refunds:
    method.startsWith('va-') || method === 'alfamart' ? ('manual' as const) : ('gateway' as const),
})

export const checkoutId: CheckoutVM = {
  surface: 'checkout',
  checkoutId: 'chk_fixture_id',
  seller: SELLER_ID,
  market: { country: 'ID', currency: 'IDR' },
  steps: [
    { id: 'contact', state: 'done' },
    { id: 'delivery', state: 'done' },
    { id: 'shipping', state: 'current' },
    { id: 'payment', state: 'todo' },
    { id: 'confirmation', state: 'todo' },
  ],
  lines,
  totals: totals({
    currency: 'IDR',
    subtotal: 1665000,
    orderDiscount: 50000,
    shipping: 25000,
    taxRegime: 'ID-PPN',
  }),
  codes: cart.codes,
  contact: {
    whatsappFirst: true,
    institutionAllowed: true,
    values: {
      fullName: 'Wayan Contoh',
      email: null,
      whatsapp: '+6281200000002',
      whatsappConfirmed: true,
      institution: null,
    },
    consents: ['marketingEmail', 'marketingWhatsapp'],
    signedIn: false,
  },
  delivery: {
    country: 'ID',
    addressShape: 'indonesia',
    savedAddresses: [],
    pickup: [{ locationId: 'showroom', location: SHOWROOM, readyWithinHours: 2 }],
    deliverBeforeAllowed: true,
    chosen: {
      kind: 'ship',
      address: ['Wayan Contoh', 'Jl. Contoh Raya No. 2', 'Sanur, Denpasar Selatan', 'Bali 80228'],
      deliverBefore: null,
    },
  },
  shipping: {
    options: [
      { ...rate('jne-reg', 'JNE', 'REG', 25000), eta: { minDays: 2, maxDays: 3 }, sameDay: false },
      {
        ...rate('sicepat-best', 'SiCepat', 'BEST', 32000),
        eta: { minDays: 1, maxDays: 1 },
        sameDay: false,
      },
      { ...rate('gosend-same-day', 'GoSend', 'Same Day', 35000), eta: null, sameDay: true },
    ],
    selected: 'jne-reg',
  },
  payment: {
    options: [
      midtrans('qris'),
      midtrans('gopay'),
      midtrans('shopeepay'),
      midtrans('va-bca'),
      midtrans('va-mandiri'),
      midtrans('card'),
      midtrans('alfamart'),
      midtrans('akulaku'),
    ],
    express: [],
    session: null,
  },
  lock: null,
  order: null,
  terms: { label: 'Terms of sale', href: '/terms' },
  problem: null,
  intents: {
    continue: { checkoutId: 'chk_fixture_id', acceptedPricing: token('tok_fixture_id_1') },
    pay: { checkoutId: 'chk_fixture_id', acceptedPricing: token('tok_fixture_id_1') },
  },
  seo: { ...seo('Checkout', '/checkout'), noindex: true },
}
