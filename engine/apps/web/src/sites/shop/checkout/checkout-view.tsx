/**
 * The checkout page (6.3.a; EXPERIENCE-SHOP.md §6; COMMERCE.md §3): a server-rendered review of
 * the lines and the server's totals beside the contact-and-delivery form. Every figure is the
 * server's (`server/shop/checkout`); the delivery fee appears only once a pin exists, quoted by
 * the fee action from the same assignment the order will use. Refusal words come from the lexicon;
 * the styles are tokens only (DESIGN-SYSTEM.md) and nothing prefetches.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { CheckoutRead } from '../../../server/shop/checkout'
import { Button } from '../../../shared/ui'
import { createHref, SITES } from '@engine/config/sites'
import { formatRupiah } from '../../../shared/ui/price/format-rupiah'
import { checkoutText } from './copy'
import styles from './checkout.module.css'
import { CheckoutForm, type CheckoutFormLabels } from './checkout-form'

export type CheckoutViewProps = {
  readonly read: CheckoutRead
  readonly locale: SiteLocale
  /** `GOOGLE_MAPS_BROWSER_KEY`, read on the server; `null` in dev and CI, where the fallback runs. */
  readonly browserKey: string | null
}

export function CheckoutView({ read, locale, browserKey }: CheckoutViewProps): React.ReactElement {
  const text = checkoutText(locale)
  const href = createHref(SITES.shop)
  const labels: CheckoutFormLabels = {
    contactTitle: text('checkout.contactTitle'),
    fullName: text('checkout.fullName'),
    fullNameHint: text('checkout.fullNameHint'),
    whatsapp: text('checkout.whatsapp'),
    whatsappHint: text('checkout.whatsappHint'),
    email: text('checkout.email'),
    deliveryTitle: text('checkout.deliveryTitle'),
    address: text('checkout.address'),
    notes: text('checkout.notes'),
    giftNote: text('checkout.giftNote'),
    mapPinRequired: text('checkout.mapPinRequired'),
    pinUseLocation: text('checkout.mapPinRequired'),
    pinPasteLink: text('checkout.pinLatLng'),
    pinLatLng: text('checkout.pinLatLng'),
    pinLatitude: text('checkout.pinLatLng'),
    pinLongitude: text('checkout.pinLatLng'),
    pinSearch: text('checkout.mapPinRequired'),
    continueToPayment: text('checkout.continueToPayment'),
    placing: text('checkout.placing'),
    invalidDetails: text('checkout.problem.invalid-details'),
  }

  return (
    <section className={styles.checkout} aria-labelledby="checkout-title">
      <h1 id="checkout-title" className={styles.title}>
        {text('checkout.reviewTitle')}
      </h1>

      {read.refusal !== null && (
        <p role="status">
          {read.refusal.key === 'bag.beyondReach'
            ? text('bag.beyondReach')
            : read.refusal.key === 'bag.deliveryUnavailable'
              ? text('bag.deliveryUnavailable')
              : text('bag.bagProblem')}
        </p>
      )}

      <div className={styles.columns}>
        <div className={styles.review} aria-label={text('checkout.reviewTitle')}>
          <ul>
            {read.lines.map((line) => (
              <li key={`${line.productId}-${line.variantSku ?? ''}`} className={styles.line}>
                <p className={styles.lineName}>
                  {line.name}
                  {line.variantLabel !== null ? ` — ${line.variantLabel}` : ''}
                  {` × ${line.qty}`}
                </p>
                {line.lineText !== null && (
                  <p className={styles.lineTotal}>{formatRupiah(Number(line.lineText))}</p>
                )}
              </li>
            ))}
          </ul>

          <dl className={styles.totals}>
            <div className={styles.totalRow}>
              <dt>{text('bag.subtotal')}</dt>
              <dd>{formatRupiah(read.subtotalIdr)}</dd>
            </div>
            {read.discountIdr > 0 && (
              <div className={styles.totalRow}>
                <dt>{text('bag.discount', { code: read.code ?? '' })}</dt>
                <dd>−{formatRupiah(read.discountIdr)}</dd>
              </div>
            )}
            <div className={[styles.totalRow, styles.grand].filter(Boolean).join(' ')}>
              <dt>{text('checkout.itemsTotal')}</dt>
              <dd>{formatRupiah(read.totalIdr)}</dd>
            </div>
          </dl>

          <p className={styles.deliveryNote}>{text('checkout.deliveryConfirmedNote')}</p>

          <div className={styles.back}>
            <Button variant="quiet" href={href('cart', {}, locale)}>
              {text('checkout.backToBag')}
            </Button>
          </div>
        </div>

        <CheckoutForm
          locale={locale}
          labels={labels}
          browserKey={browserKey}
          expectedTotalIdr={read.totalIdr}
        />
      </div>
    </section>
  )
}
