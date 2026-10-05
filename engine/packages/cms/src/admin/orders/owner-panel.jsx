/**
 * The owner and editor order views (TASKS.md 7.2.b; CONTENT-OPERATIONS.md §5.2–§5.4): filter by
 * status and store, reassign, cancel, and the "needs you" flag for a hand-back. Plain links and
 * forms, as `store-panel.jsx`. `.jsx`: see `shared.jsx`'s header.
 */
import { ORDER_STATUS_OPTIONS, ORDER_STATUS_LABELS } from '../../collections/orders/statuses'
import { BigButton, Card, L, Notice, QuietLink, SubmitButton, refusalCopy, rupiah } from './shared'

export function OwnerFilterBar({ stores, filter, language }) {
  return (
    <form method="get" action="/admin/orders" style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
      <label>
        {L('filterStatus', language)}
        <select name="status" defaultValue={filter.status} style={{ display: 'block' }}>
          <option value="">{L('filterAll', language)}</option>
          {ORDER_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label[language]}
            </option>
          ))}
        </select>
      </label>
      <label>
        {L('filterStore', language)}
        <select name="store" defaultValue={filter.store} style={{ display: 'block' }}>
          <option value="">{L('filterAll', language)}</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton variant="quiet">{L('filterAll', language)}</SubmitButton>
    </form>
  )
}

export function OwnerList({ orders, language }) {
  if (orders.length === 0) return <p>{L('emptyList', language)}</p>
  return (
    <div>
      {orders.map((order) => (
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
              {order.storeSnapshot?.name ?? '—'} · {order.contact.name} · {rupiah(order.totals.total)}
              {order.needsAttention?.flag && (
                <strong style={{ color: 'var(--theme-error-500)', marginLeft: 8 }}>
                  {L('needsAttention', language)}
                </strong>
              )}
            </div>
          </Card>
        </a>
      ))}
    </div>
  )
}

export function OwnerDetail({ order, stores, step, language, error }) {
  const reassigning = step.reassigning
  const cancelling = step.cancelling
  return (
    <div>
      <QuietLink href="/admin/orders">← {L('back', language)}</QuietLink>
      <h2 style={{ marginTop: 8 }}>
        #{order.number} — {ORDER_STATUS_LABELS[order.status]?.[language]}
      </h2>
      <Notice tone="error">{error ? refusalCopy(error, language) : null}</Notice>
      {order.needsAttention?.flag && (
        <Notice tone="error">
          {L('needsAttention', language)}: {order.needsAttention.reason}
        </Notice>
      )}

      <Card>
        <p>
          {order.storeSnapshot?.name ?? '—'} · {order.contact.name} · {rupiah(order.totals.total)}
        </p>
        <p style={{ whiteSpace: 'pre-wrap' }}>{order.delivery.address}</p>
      </Card>

      {reassigning ? (
        <Card>
          <form method="post" action={`/api/x/orders/${order.id}/reassign`}>
            <label htmlFor="reassign-store">{L('reassignToStore', language)}</label>
            <select id="reassign-store" name="toStoreId" required style={{ display: 'block', margin: '8px 0' }}>
              {stores
                .filter((s) => s.id !== order.store)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.area ? `(${s.area})` : ''}
                  </option>
                ))}
            </select>
            <div style={{ display: 'flex', gap: 12 }}>
              <SubmitButton>{L('reassignSubmit', language)}</SubmitButton>
              <QuietLink href={`/admin/orders/${order.id}`}>{L('cancelSheet', language)}</QuietLink>
            </div>
          </form>
        </Card>
      ) : cancelling ? (
        <Card>
          <form method="post" action={`/api/x/orders/${order.id}/move`}>
            <input type="hidden" name="to" value="cancelled" />
            <label htmlFor="cancel-reason">{L('cancelReasonLabel', language)}</label>
            <textarea
              id="cancel-reason"
              name="reason"
              required
              maxLength={500}
              style={{ width: '100%', minHeight: 80, display: 'block', margin: '8px 0' }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <SubmitButton variant="danger">{L('cancelSubmit', language)}</SubmitButton>
              <QuietLink href={`/admin/orders/${order.id}`}>{L('cancelSheet', language)}</QuietLink>
            </div>
          </form>
        </Card>
      ) : (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {step.forward && (
            <form method="post" action={`/api/x/orders/${order.id}/move`}>
              <input type="hidden" name="to" value={step.forward.to} />
              <SubmitButton>{ORDER_STATUS_LABELS[step.forward.to]?.[language]}</SubmitButton>
            </form>
          )}
          {step.backward && (
            <form method="post" action={`/api/x/orders/${order.id}/move`}>
              <input type="hidden" name="to" value={step.backward} />
              <SubmitButton variant="quiet">{ORDER_STATUS_LABELS[step.backward]?.[language]}</SubmitButton>
            </form>
          )}
          {step.canReassign && (
            <BigButton href={`/admin/orders/${order.id}?reassign=1`} variant="quiet">
              {L('reassign', language)}
            </BigButton>
          )}
          {step.canCancel && (
            <BigButton href={`/admin/orders/${order.id}?cancel=1`} variant="danger">
              {L('cancelOrder', language)}
            </BigButton>
          )}
        </div>
      )}
    </div>
  )
}
