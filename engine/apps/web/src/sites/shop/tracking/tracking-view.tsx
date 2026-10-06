/**
 * The tracking page's body (TASKS.md 7.3.a; COMMERCE.md §10): the status timeline, the lines and
 * totals, the sending store, the driver image once attached, and the shop's WhatsApp. Everything
 * here is `TrackingView` the loader already projected — no further access decision is made here.
 */
import type { SiteLocale } from '@engine/config/sites'

import { Price, ResponsiveImage, StatusTimeline, TextLink } from '../../../shared/ui'
import type { TrackingView } from '../../../server/shop/tracking/load-tracking'
import { trackingText } from './copy'
import styles from './tracking.module.css'

export type TrackingPageProps = {
  readonly view: TrackingView
  readonly locale: SiteLocale
  readonly shopWhatsapp: string | null
}

export function TrackingPage({
  view,
  locale,
  shopWhatsapp,
}: TrackingPageProps): React.ReactElement {
  void locale
  const text = trackingText(view.locale)
  const wa = shopWhatsapp
    ? `https://wa.me/${shopWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
        text('tracking.whatsappMessage', { number: String(view.orderNumber) }),
      )}`
    : null

  const steps = view.steps.map((step) => ({
    key: step.key,
    label: text(`tracking.status.${step.key}`),
    at: step.at ?? undefined,
  }))

  return (
    <section className={styles.tracking} aria-labelledby="tracking-title">
      <h1 id="tracking-title" className={styles.title}>
        {text('tracking.title', { number: String(view.orderNumber) })}
      </h1>

      {view.status === 'pending_payment' && <p role="status">{text('tracking.pendingNote')}</p>}
      {view.status === 'cancelled' && <p role="status">{text('tracking.cancelledNote')}</p>}
      {view.status === 'expired' && <p role="status">{text('tracking.expiredNote')}</p>}

      {view.status !== 'pending_payment' &&
        view.status !== 'cancelled' &&
        view.status !== 'expired' && (
          <StatusTimeline
            steps={steps}
            current={view.status}
            ariaLabel={text('tracking.title', { number: String(view.orderNumber) })}
          />
        )}

      {view.driverImageUrl && (
        <div className={styles.driver}>
          <h2 className={styles.sectionTitle}>{text('tracking.driverTitle')}</h2>
          <ResponsiveImage
            variant="fixed"
            width={320}
            height={320}
            src={view.driverImageUrl}
            alt={text('tracking.driverTitle')}
            sizes="320px"
          />
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{text('tracking.itemsTitle')}</h2>
        <ul className={styles.items}>
          {view.items.map((item, index) => (
            <li key={index} className={styles.item}>
              <span>
                {item.qty}× {item.name}
              </span>
            </li>
          ))}
        </ul>
        <dl className={styles.totals}>
          <div className={styles.totalRow}>
            <dt>{text('tracking.totalsSubtotal')}</dt>
            <dd>
              <Price amount={view.totals.subtotal} />
            </dd>
          </div>
          {view.totals.discount > 0 && (
            <div className={styles.totalRow}>
              <dt>{text('tracking.totalsDiscount')}</dt>
              <dd>
                -<Price amount={view.totals.discount} />
              </dd>
            </div>
          )}
          <div className={styles.totalRow}>
            <dt>{text('tracking.totalsDelivery')}</dt>
            <dd>
              <Price amount={view.totals.deliveryFee} />
            </dd>
          </div>
          <div className={styles.totalRow}>
            <dt>{text('tracking.totalsTotal')}</dt>
            <dd>
              <Price amount={view.totals.total} />
            </dd>
          </div>
        </dl>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{text('tracking.deliveryTitle')}</h2>
        <p>{view.deliveryAddress}</p>
        <p>
          {view.contact.nameMasked} · {view.contact.emailMasked}
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{text('tracking.storeTitle')}</h2>
        <p>
          {view.store.name}
          {view.store.area ? ` · ${view.store.area}` : ''}
        </p>
      </div>

      {wa && (
        <TextLink href={wa} className={styles.whatsapp}>
          {text('tracking.whatsapp')}
        </TextLink>
      )}
    </section>
  )
}
