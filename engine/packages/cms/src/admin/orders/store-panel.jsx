/**
 * The store user's queue and order screen (TASKS.md 7.2.a; CONTENT-OPERATIONS.md §5.1). Every
 * action is a plain link or form — no client JavaScript on the critical path, so a first-timer's
 * phone needs nothing but the page Payload already serves. Styled by `ix-*` classes in
 * `app/(payload)/admin/panels.css`. `.jsx`: see `shared.jsx`'s header.
 */
import { ORDER_STATUS_LABELS } from '../../collections/orders/statuses'
import {
  BigButton,
  Card,
  L,
  Notice,
  QuietLink,
  StatusTag,
  SubmitButton,
  refusalCopy,
  rupiah,
} from './shared'
import { googleMapsLink, whatsappLink } from './data'
import { QuotePanel } from './quote-panel'
import { ReplacementLinks } from './replace-panel'

/** "14:30" in Bali time (Asia/Makassar, UTC+8) — mirrors `./quote-panel.jsx`'s `baliClock`. */
function baliClock(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Makassar',
    }).format(date)
  } catch {
    return ''
  }
}

function LineItem({ line }) {
  return (
    <div className="ix-line">
      <span>
        {line.qty}× {line.name}
        {line.variantLabel ? ` — ${line.variantLabel}` : ''}
      </span>
      <span className="ix-num">{rupiah(line.lineTotal)}</span>
    </div>
  )
}

export function StoreQueue({ orders, language }) {
  const needsPrice = orders
    .filter((o) => o.status === 'awaiting_quote')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const waitingForPayment = orders.filter((o) => o.status === 'pending_payment')
  const paid = orders.filter((o) => o.status === 'paid')
  const inProgress = orders.filter((o) =>
    ['processing', 'waiting_driver', 'on_the_way'].includes(o.status),
  )
  const today = new Date().toISOString().slice(0, 10)
  const deliveredToday = orders.filter(
    (o) => o.status === 'delivered' && (o.updatedAt ?? '').slice(0, 10) === today,
  )
  const groups = [
    ['groupNeedsPrice', needsPrice],
    ['groupWaitingForPayment', waitingForPayment],
    ['groupNew', paid],
    ['groupInProgress', inProgress],
    ['groupDeliveredToday', deliveredToday],
  ]
  const any =
    needsPrice.length +
      waitingForPayment.length +
      paid.length +
      inProgress.length +
      deliveredToday.length >
    0
  return (
    <div>
      {!any && <p className="ix-empty">{L('emptyList', language)}</p>}
      {groups.map(([titleKey, rows]) =>
        rows.length === 0 ? null : (
          <section key={titleKey} className="ix-group">
            <h2 className="ix-group__title">
              {L(titleKey, language)} ({rows.length})
            </h2>
            <ul className="ix-list">
              {rows.map((order) => (
                <li key={order.id}>
                  <a href={`/admin/orders/${order.id}`} className="ix-item">
                    <span className="ix-item__head">
                      <strong className="ix-order-no">#{order.number}</strong>
                      <StatusTag status={order.status}>
                        {ORDER_STATUS_LABELS[order.status]?.[language]}
                      </StatusTag>
                    </span>
                    <span className="ix-item__sub">
                      {order.contact.name} ·{' '}
                      <span className="ix-item__total">{rupiah(order.totals.total)}</span>
                    </span>
                    {order.channel === 'replacement' && (
                      <span className="ix-item__sub ix-strong">
                        {L('replacementBadge', language)}
                      </span>
                    )}
                    {order.status === 'awaiting_quote' && order.expiresAt && (
                      <span className="ix-item__sub">
                        {L('quoteByPrefix', language)} {baliClock(order.expiresAt)}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
    </div>
  )
}

export function StoreDetail({ order, step, language, imagePreviewUrl, payLink, linked, error }) {
  const confirmTo = step.confirmTo
  const handback = step.handback
  return (
    <main className="ix-page">
      <QuietLink href="/admin/orders">← {L('back', language)}</QuietLink>
      <div className="ix-order-head">
        <h1 className="ix-record">#{order.number}</h1>
        <StatusTag status={order.status}>{ORDER_STATUS_LABELS[order.status]?.[language]}</StatusTag>
      </div>
      <Notice tone="error">{error ? refusalCopy(error, language) : null}</Notice>
      <ReplacementLinks order={order} linked={linked} language={language} />

      {order.status === 'awaiting_quote' && (
        <QuotePanel order={order} language={language} payLink={payLink} />
      )}

      <Card>
        <h2 className="ix-card__title">{L('items', language)}</h2>
        {order.lines.map((line, i) => (
          <LineItem key={line.id ?? i} line={line} />
        ))}
        {order.totals.deliveryFee != null && (
          <div className="ix-line">
            <span>{L('deliveryFee', language)}</span>
            <span className="ix-num">{rupiah(order.totals.deliveryFee)}</span>
          </div>
        )}
        <div className="ix-line ix-line--total">
          <span>{L('total', language)}</span>
          <span className="ix-num">{rupiah(order.totals.total)}</span>
        </div>
      </Card>

      <Card>
        <h2 className="ix-card__title">{L('address', language)}</h2>
        <p className="ix-pre">{order.delivery.address}</p>
        {order.delivery.notes && <p>{order.delivery.notes}</p>}
        <div className="ix-links">
          <a
            href={googleMapsLink(order.delivery.lat, order.delivery.lng)}
            target="_blank"
            rel="noreferrer"
            className="ix-btn ix-btn--quiet"
          >
            {L('openInMaps', language)}
          </a>
          <a
            href={whatsappLink(order.contact.whatsapp)}
            target="_blank"
            rel="noreferrer"
            className="ix-btn ix-btn--quiet"
          >
            {L('whatsappBuyer', language)}
          </a>
        </div>
        {order.giftNote && (
          <p>
            <strong>{L('giftNote', language)}:</strong> {order.giftNote}
          </p>
        )}
      </Card>

      <Card>
        <h2 className="ix-card__title">{L('driverImageTitle', language)}</h2>
        {imagePreviewUrl ? (
          <p>{L('driverImageAttached', language)}</p>
        ) : (
          <p className="ix-muted">{L('driverImageHint', language)}</p>
        )}
        <form
          method="post"
          action={`/api/x/orders/${order.id}/driver-image`}
          encType="multipart/form-data"
        >
          {/* Phone-sized (10.4 proxy run, S3): the file input is 44 px tall in panels.css. */}
          <input
            type="file"
            name="file"
            aria-label={L('driverImageFileLabel', language)}
            accept="image/*"
            capture="environment"
            required
            className="ix-input ix-input--file"
          />
          <SubmitButton variant="quiet">{L('driverImageUpload', language)}</SubmitButton>
        </form>
      </Card>

      {confirmTo ? (
        <Card className="ix-card--step">
          <p>
            {L('confirmMoveTo', language)} “{ORDER_STATUS_LABELS[confirmTo]?.[language]}”?
          </p>
          <div className="ix-actions">
            <form method="post" action={`/api/x/orders/${order.id}/move`}>
              <input type="hidden" name="to" value={confirmTo} />
              <SubmitButton>{L('confirm', language)}</SubmitButton>
            </form>
            <QuietLink href={`/admin/orders/${order.id}`}>{L('cancelSheet', language)}</QuietLink>
          </div>
        </Card>
      ) : handback ? (
        <Card className="ix-card--step">
          <form method="post" action={`/api/x/orders/${order.id}/hand-back`}>
            <label htmlFor="handback-reason" className="ix-label">
              {L('handBackReasonLabel', language)}
            </label>
            <textarea
              id="handback-reason"
              name="reason"
              required
              maxLength={500}
              placeholder={L('handBackReasonPlaceholder', language)}
              className="ix-input ix-input--area"
            />
            <div className="ix-actions">
              <SubmitButton>{L('handBackSubmit', language)}</SubmitButton>
              <QuietLink href={`/admin/orders/${order.id}`}>{L('cancelSheet', language)}</QuietLink>
            </div>
          </form>
        </Card>
      ) : (
        <div className="ix-actions ix-actions--bar">
          {step.next ? (
            <BigButton
              href={`/admin/orders/${order.id}?confirm=${step.next.to}`}
              disabled={!step.next.judgement.ok}
              title={step.next.judgement.ok ? undefined : step.next.judgement.message}
            >
              {ORDER_STATUS_LABELS[step.next.to]?.[language]}
            </BigButton>
          ) : (
            <p className="ix-muted">{L('noNextStep', language)}</p>
          )}
          {step.canHandBack && (
            <BigButton href={`/admin/orders/${order.id}?handback=1`} variant="quiet">
              {L('handBack', language)}
            </BigButton>
          )}
        </div>
      )}
    </main>
  )
}
