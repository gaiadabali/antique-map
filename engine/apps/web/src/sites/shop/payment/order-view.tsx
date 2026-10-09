/**
 * The order page (TASKS.md 6.5.a; EXPERIENCE-SHOP.md §7–§8): what the buyer sees by the order's
 * status — pending, confirming, failed, paid, expired, or an expired order a late payment reached.
 * Every figure is the server's own (`OrderView`); nothing here prices anything.
 */
import { Button, SectionHead, TextLink } from '../../../shared/ui'
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
      {order.totals.deliveryIdr !== null && (
        <dl className={styles.totalRow}>
          <dt>{t('order.deliveryFee')}</dt>
          <dd>{formatRupiah(order.totals.deliveryIdr)}</dd>
        </dl>
      )}
      <dl className={[styles.totalRow, styles.grand].join(' ')}>
        <dt>{t('order.total')}</dt>
        <dd>{formatRupiah(order.totals.totalIdr)}</dd>
      </dl>
    </div>
  )
}

/**
 * Items total only — the Confirming-delivery state, before a fee exists to add to it. Reuses
 * `order.totals.totalIdr` directly: the core keeps it equal to items minus discount until the
 * order is quoted (`createOrder`, TASKS.md 6.6-core), so there is nothing to recompute here.
 */
function ItemsTotal({ order, t }: { readonly order: OrderViewData; readonly t: PaymentText }) {
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
        <dt>{t('order.itemsTotal')}</dt>
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
      <Button type="submit" variant="secondary">
        {t('order.putBackInBag')}
      </Button>
    </form>
  )

  if (order.status === 'expired' && order.needsAttention?.reason === 'late_payment') {
    return (
      <section className={styles.page} aria-labelledby="order-status">
        <SectionHead level={1} id="order-status" title={t('order.lateChargeTitle')} />
        <Totals order={order} t={t} />
      </section>
    )
  }

  // An order that expired `awaiting_quote` (staff never quoted it in time) never had a delivery
  // fee to show: `totals.deliveryIdr` stayed `null` (COMMERCE.md's 2026-10-06 decision).
  if (order.status === 'expired' && order.totals.deliveryIdr === null) {
    return (
      <section className={styles.page} aria-labelledby="order-status">
        <SectionHead level={1} id="order-status" title={t('order.quotedExpiredTitle')} />
        {putBackForm}
        <ItemsTotal order={order} t={t} />
      </section>
    )
  }

  if (order.status === 'expired') {
    return (
      <section className={styles.page} aria-labelledby="order-status">
        <SectionHead
          level={1}
          id="order-status"
          title={t('order.expiredTitle', { time: deadline })}
        />
        <p className={styles.body}>{t('order.expiredBody')}</p>
        {putBackForm}
        <Totals order={order} t={t} />
      </section>
    )
  }

  if (order.status === 'awaiting_quote') {
    return (
      <section className={styles.page} aria-labelledby="order-status">
        <AutoRefresh />
        <SectionHead
          level={1}
          id="order-status"
          eyebrow={t('order.title', { number: String(order.number) })}
          title={t('order.confirmingDeliveryTitle')}
        />
        {order.storeArea !== null && (
          <p className={styles.body}>
            {t('order.confirmingDeliverySendingFrom', { store: order.storeArea })}
          </p>
        )}
        <p className={styles.notice}>{t('order.confirmingDeliveryBody')}</p>
        <TextLink href={orderHref}>{t('order.checkAgain')}</TextLink>
        <ItemsTotal order={order} t={t} />
      </section>
    )
  }

  if (order.status === 'cancelled') {
    return (
      <section className={styles.page} aria-labelledby="order-status">
        <SectionHead level={1} id="order-status" title={t('order.cancelledTitle')} />
        <TextLink href={trackingHref}>{t('order.trackingLink')}</TextLink>
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
        <SectionHead
          level={1}
          id="order-status"
          title={
            failed
              ? t('order.failedTitle')
              : confirming
                ? t('order.confirmingTitle')
                : t('order.title', { number: String(order.number) })
          }
        />
        <p className={styles.body}>
          {confirming ? t('order.confirmingText') : !failed && t('order.payBy', { time: deadline })}
        </p>
        {!confirming && payForm(failed ? t('order.tryAgain') : payingLabel)}
        {!confirming && !failed && <p className={styles.notice}>{t('order.pendingText')}</p>}
        <TextLink href={orderHref}>{t('order.checkAgain')}</TextLink>
        <Totals order={order} t={t} />
      </section>
    )
  }

  // paid, processing, waiting_driver, on_the_way, delivered: the confirmation.
  return (
    <section className={styles.page} aria-labelledby="order-status">
      <SectionHead level={1} id="order-status" title={t('order.paidTitle')} />
      {order.storeArea !== null && (
        <p className={styles.body}>{t('order.paidBody', { store: order.storeArea })}</p>
      )}
      <TextLink href={trackingHref}>{t('order.trackingLink')}</TextLink>
      <Totals order={order} t={t} />
    </section>
  )
}
