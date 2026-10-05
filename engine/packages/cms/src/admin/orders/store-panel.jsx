/**
 * The store user's queue and order screen (TASKS.md 7.2.a; CONTENT-OPERATIONS.md §5.1). Every
 * action is a plain link or form — no client JavaScript on the critical path, so a first-timer's
 * phone needs nothing but the page Payload already serves. `.jsx`: see `shared.jsx`'s header.
 */
import { ORDER_STATUS_LABELS } from '../../collections/orders/statuses'
import { BigButton, Card, L, Notice, QuietLink, SubmitButton, refusalCopy, rupiah } from './shared'
import { googleMapsLink, whatsappLink } from './data'

function LineItem({ line }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0' }}>
      <span>
        {line.qty}× {line.name}
        {line.variantLabel ? ` — ${line.variantLabel}` : ''}
      </span>
      <span>{rupiah(line.lineTotal)}</span>
    </div>
  )
}

export function StoreQueue({ orders, language }) {
  const paid = orders.filter((o) => o.status === 'paid')
  const inProgress = orders.filter((o) =>
    ['processing', 'waiting_driver', 'on_the_way'].includes(o.status),
  )
  const today = new Date().toISOString().slice(0, 10)
  const deliveredToday = orders.filter(
    (o) => o.status === 'delivered' && (o.updatedAt ?? '').slice(0, 10) === today,
  )
  const groups = [
    ['groupNew', paid],
    ['groupInProgress', inProgress],
    ['groupDeliveredToday', deliveredToday],
  ]
  const any = paid.length + inProgress.length + deliveredToday.length > 0
  return (
    <div>
      {!any && <p>{L('emptyList', language)}</p>}
      {groups.map(([titleKey, rows]) =>
        rows.length === 0 ? null : (
          <section key={titleKey} style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, margin: '0 0 8px' }}>
              {L(titleKey, language)} ({rows.length})
            </h3>
            {rows.map((order) => (
              <a
                key={order.id}
                href={`/admin/orders/${order.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>#{order.number}</strong>
                    <span>{ORDER_STATUS_LABELS[order.status]?.[language]}</span>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--theme-elevation-600)' }}>
                    {order.contact.name} · {rupiah(order.totals.total)}
                  </div>
                </Card>
              </a>
            ))}
          </section>
        ),
      )}
    </div>
  )
}

export function StoreDetail({ order, step, language, imagePreviewUrl, error }) {
  const confirmTo = step.confirmTo
  const handback = step.handback
  return (
    <div>
      <QuietLink href="/admin/orders">← {L('back', language)}</QuietLink>
      <h2 style={{ marginTop: 8 }}>
        #{order.number} — {ORDER_STATUS_LABELS[order.status]?.[language]}
      </h2>
      <Notice tone="error">{error ? refusalCopy(error, language) : null}</Notice>

      <Card>
        <h3 style={{ marginTop: 0 }}>{L('items', language)}</h3>
        {order.lines.map((line, i) => (
          <LineItem key={line.id ?? i} line={line} />
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 8 }}>
          <span>{L('total', language)}</span>
          <span>{rupiah(order.totals.total)}</span>
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>{L('address', language)}</h3>
        <p style={{ whiteSpace: 'pre-wrap' }}>{order.delivery.address}</p>
        {order.delivery.notes && <p>{order.delivery.notes}</p>}
        <div style={{ display: 'flex', gap: 16 }}>
          <a href={googleMapsLink(order.delivery.lat, order.delivery.lng)} target="_blank" rel="noreferrer">
            {L('openInMaps', language)}
          </a>
          <a href={whatsappLink(order.contact.whatsapp)} target="_blank" rel="noreferrer">
            {L('whatsappBuyer', language)}
          </a>
        </div>
        {order.giftNote && (
          <p style={{ marginTop: 8 }}>
            <strong>{L('giftNote', language)}:</strong> {order.giftNote}
          </p>
        )}
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>{L('driverImageTitle', language)}</h3>
        {imagePreviewUrl ? (
          <p>{L('driverImageAttached', language)}</p>
        ) : (
          <p style={{ fontSize: 14 }}>{L('driverImageHint', language)}</p>
        )}
        <form
          method="post"
          action={`/api/x/orders/${order.id}/driver-image`}
          encType="multipart/form-data"
        >
          <input type="file" name="file" accept="image/*" capture="environment" required />
          <button type="submit" style={{ marginLeft: 8 }}>
            {L('driverImageUpload', language)}
          </button>
        </form>
      </Card>

      {confirmTo ? (
        <Card>
          <p>
            {L('confirmMoveTo', language)} “{ORDER_STATUS_LABELS[confirmTo]?.[language]}”?
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <form method="post" action={`/api/x/orders/${order.id}/move`}>
              <input type="hidden" name="to" value={confirmTo} />
              <SubmitButton>{L('confirm', language)}</SubmitButton>
            </form>
            <QuietLink href={`/admin/orders/${order.id}`}>{L('cancelSheet', language)}</QuietLink>
          </div>
        </Card>
      ) : handback ? (
        <Card>
          <form method="post" action={`/api/x/orders/${order.id}/hand-back`}>
            <label htmlFor="handback-reason">{L('handBackReasonLabel', language)}</label>
            <textarea
              id="handback-reason"
              name="reason"
              required
              maxLength={500}
              placeholder={L('handBackReasonPlaceholder', language)}
              style={{ width: '100%', minHeight: 80, display: 'block', margin: '8px 0' }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <SubmitButton>{L('handBackSubmit', language)}</SubmitButton>
              <QuietLink href={`/admin/orders/${order.id}`}>{L('cancelSheet', language)}</QuietLink>
            </div>
          </form>
        </Card>
      ) : (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {step.next ? (
            <BigButton
              href={`/admin/orders/${order.id}?confirm=${step.next.to}`}
              disabled={!step.next.judgement.ok}
              title={step.next.judgement.ok ? undefined : step.next.judgement.message}
            >
              {ORDER_STATUS_LABELS[step.next.to]?.[language]}
            </BigButton>
          ) : (
            <p>{L('noNextStep', language)}</p>
          )}
          {step.canHandBack && (
            <BigButton href={`/admin/orders/${order.id}?handback=1`} variant="quiet">
              {L('handBack', language)}
            </BigButton>
          )}
        </div>
      )}
    </div>
  )
}
