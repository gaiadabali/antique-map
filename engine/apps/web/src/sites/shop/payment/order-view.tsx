/**
 * The order page (TASKS.md 6.5.a; EXPERIENCE-SHOP.md §7–§8): what the buyer sees by the order's
 * status — pending, confirming, failed, paid, expired, or an expired order a late payment reached.
 * Every figure is the server's own (`OrderView`); nothing here prices anything.
 */
import { formatRupiah } from '../../../shared/ui/price/format-rupiah'
import { baliTime } from './bali-time'
import { paymentText, type PaymentText } from './copy'
import { putBackInBagAction, type OrderView as OrderViewData } from '../../../server/shop/payment'
import { AutoRefresh } from './auto-refresh'
import { PayForm } from './pay-form'
import styles from './order-view.module.css'

export type OrderViewProps = {
  readonly order: OrderViewData
  readonly token: string
  readonly locale: 'en' | 'id'
  readonly orderHref: string
  readonly trackingHref: string
  /** `null` off simulate mode and off a Snap mode without a reachable client key. */
  readonly snap: { readonly scriptSrc: string } | null
}

/** Still waiting on the buyer or the bank — no news to show yet. */
const OPEN_STATES = new Set(['opening', 'open', 'pending'])
/** The attempt did not go through; the buyer may try again inside the window. */
const FAILED_STATES = new Set(['deny', 'failed'])

function Totals({ order, t }: { readonly order: OrderViewData; readonly t: PaymentText }) {
  return (
    <div className={styles.totals}>
      <ul className={styles.lines}>
        {order.lines.map((line, i) => (
          <li key={i} className={styles.line}>
            <span>
              {line.name}
              {line.variantLabel !== null && (
                <span className={styles.variant}> · {line.variantLabel}</span>
              )}
              {` × ${line.qty}`}
            </span>
            <span>{formatRupiah(line.lineTotalIdr)}</span>
          </li>
        ))}
      </ul>
      <dl className={[styles.totalRow, styles.grand].join(' ')}>
        <dt>{t('order.total')}</dt>
        <dd>{formatRupiah(order.totals.totalIdr)}</dd>
      </dl>
    </div>
  )
}

export function OrderView({
  order,
  token,
  locale,
  orderHref,
  trackingHref,
  snap,
}: OrderViewProps): React.ReactElement {
  const t = paymentText(locale)
  const deadline = baliTime(order.expiresAt, locale)
  const payingLabel = t('order.pay', { total: formatRupiah(order.totals.totalIdr) })

  const payForm = (label: string) => (
    <PayForm
      token={token}
      locale={locale}
      label={label}
      scriptSrc={snap?.scriptSrc ?? ''}
      redirectUrlFallback={orderHref}
    />
  )
  const putBackForm = (
    <form action={putBackInBagAction}>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="locale" value={locale} />
      <button type="submit">{t('order.putBackInBag')}</button>
    </form>
  )

  if (order.status === 'expired' && order.needsAttention?.reason === 'late_payment') {
    return (
      <section className={styles.page} aria-labelledby="order-status">
        <h1 id="order-status" className={styles.status}>
          {t('order.lateChargeTitle')}
        </h1>
        <Totals order={order} t={t} />
      </section>
    )
  }

  if (order.status === 'expired') {
    return (
      <section className={styles.page} aria-labelledby="order-status">
        <h1 id="order-status" className={styles.status}>
          {t('order.expiredTitle', { time: deadline })}
        </h1>
        <p className={styles.body}>{t('order.expiredBody')}</p>
        {putBackForm}
        <Totals order={order} t={t} />
      </section>
    )
  }

  if (order.status === 'cancelled') {
    return (
      <section className={styles.page} aria-labelledby="order-status">
        <h1 id="order-status" className={styles.status}>
          {t('order.cancelledTitle')}
        </h1>
        <a href={trackingHref}>{t('order.trackingLink')}</a>
        <Totals order={order} t={t} />
      </section>
    )
  }

  if (order.status === 'pending_payment') {
    const attemptState = order.attempt?.state ?? null
    const failed = attemptState !== null && FAILED_STATES.has(attemptState)
    const confirming = attemptState !== null && !OPEN_STATES.has(attemptState) && !failed
    return (
      <section className={styles.page} aria-labelledby="order-status">
        <AutoRefresh />
        <h1 id="order-status" className={styles.status}>
          {failed
            ? t('order.failedTitle')
            : confirming
              ? t('order.confirmingTitle')
              : t('order.title', { number: order.number })}
        </h1>
        <p className={styles.body}>
          {confirming ? t('order.confirmingText') : !failed && t('order.payBy', { time: deadline })}
        </p>
        {!confirming && payForm(failed ? t('order.tryAgain') : payingLabel)}
        {!confirming && !failed && <p className={styles.notice}>{t('order.pendingText')}</p>}
        <a href={orderHref}>{t('order.checkAgain')}</a>
        <Totals order={order} t={t} />
      </section>
    )
  }

  // paid, processing, waiting_driver, on_the_way, delivered: the confirmation.
  return (
    <section className={styles.page} aria-labelledby="order-status">
      <h1 id="order-status" className={styles.status}>
        {t('order.paidTitle')}
      </h1>
      {order.storeArea !== null && (
        <p className={styles.body}>{t('order.paidBody', { store: order.storeArea })}</p>
      )}
      <a href={trackingHref}>{t('order.trackingLink')}</a>
      <Totals order={order} t={t} />
    </section>
  )
}
