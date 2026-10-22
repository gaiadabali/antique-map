/**
 * The owner and editor order views (TASKS.md 7.2.b; CONTENT-OPERATIONS.md §5.2–§5.5): filter by
 * status and store, reassign, cancel, the "needs you" flag with its reason and a way to clear it,
 * and Replace damaged item on a delivered order (TASKS.md 10.7, `./replace-panel`). Plain links
 * and forms, as `store-panel.jsx`. `.jsx`: see `shared.jsx`'s header.
 */
import { ORDER_STATUS_OPTIONS, ORDER_STATUS_LABELS } from '../../collections/orders/statuses'
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
import { QuotePanel } from './quote-panel'
import { ClearFlagSheet, LinesCard, ReplaceSheet, ReplacementLinks } from './replace-panel'

export function OwnerFilterBar({ stores, filter, language }) {
  return (
    <form method="get" action="/admin/orders" className="ix-filter">
      <label className="ix-label">
        {L('filterStatus', language)}
        <select name="status" defaultValue={filter.status} className="ix-input">
          <option value="">{L('filterAll', language)}</option>
          {ORDER_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label[language]}
            </option>
          ))}
        </select>
      </label>
      <label className="ix-label">
        {L('filterStore', language)}
        <select name="store" defaultValue={filter.store} className="ix-input">
          <option value="">{L('filterAll', language)}</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton variant="quiet">{L('filterSubmit', language)}</SubmitButton>
    </form>
  )
}

export function OwnerList({ orders, language }) {
  if (orders.length === 0) return <p className="ix-empty">{L('emptyList', language)}</p>
  return (
    <ul className="ix-list">
      {orders.map((order) => (
        <li key={order.id}>
          <a href={`/admin/orders/${order.id}`} className="ix-item ix-item--cols">
            <strong className="ix-order-no ix-item__no">#{order.number}</strong>
            <span className="ix-item__tag">
              {order.needsAttention?.flag && (
                <span className="ix-tag ix-tag--danger">{L('needsAttention', language)}</span>
              )}
              <StatusTag status={order.status}>
                {ORDER_STATUS_LABELS[order.status]?.[language]}
              </StatusTag>
            </span>
            <span className="ix-item__meta">
              <span className="ix-item__store">{order.storeSnapshot?.name ?? '—'}</span>
              <span className="ix-item__who">{order.contact.name}</span>
              <span className="ix-item__total">{rupiah(order.totals.total)}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}

/** "Page n of m", with newer and older links that keep the status and store filters. */
export function OwnerPager({ page, totalPages, filter, language }) {
  if (totalPages <= 1) return null
  const href = (p) => {
    const pairs = [
      ['status', filter.status],
      ['store', filter.store],
      ['page', String(p)],
    ].filter(([, value]) => value)
    const qs = pairs.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')
    return `/admin/orders?${qs}`
  }
  const label = L('pageOf', language).replace('{page}', page).replace('{total}', totalPages)
  return (
    <div className="ix-pager">
      {page > 1 ? <QuietLink href={href(page - 1)}>{L('pagePrev', language)}</QuietLink> : <span />}
      <span className="ix-muted">{label}</span>
      {page < totalPages ? (
        <QuietLink href={href(page + 1)}>{L('pageNext', language)}</QuietLink>
      ) : (
        <span />
      )}
    </div>
  )
}

export function OwnerDetail({ order, stores, step, language, payLink, linked, error }) {
  const { reassigning, cancelling, replacing, clearingFlag } = step
  const refused = error
    ? refusalCopy(error, language).replace('{store}', order.storeSnapshot?.name ?? '—')
    : null
  return (
    <main className="ix-page">
      <QuietLink href="/admin/orders">← {L('back', language)}</QuietLink>
      <div className="ix-order-head">
        <h1 className="ix-record">#{order.number}</h1>
        <StatusTag status={order.status}>{ORDER_STATUS_LABELS[order.status]?.[language]}</StatusTag>
      </div>
      <Notice tone="error">{refused}</Notice>
      {order.needsAttention?.flag && (
        <Notice tone="error">
          {L('needsAttention', language)}: {order.needsAttention.reason}
        </Notice>
      )}
      <ReplacementLinks order={order} linked={linked} language={language} />

      {order.status === 'awaiting_quote' && (
        <QuotePanel order={order} language={language} payLink={payLink} />
      )}

      <Card>
        <p>
          {order.storeSnapshot?.name ?? '—'} · {order.contact.name} ·{' '}
          <span className="ix-num">{rupiah(order.totals.total)}</span>
          {order.totals.deliveryFee != null && (
            <>
              {' '}
              · {L('deliveryFee', language)}:{' '}
              <span className="ix-num">{rupiah(order.totals.deliveryFee)}</span>
            </>
          )}
        </p>
        <p className="ix-pre">{order.delivery.address}</p>
      </Card>
      <LinesCard order={order} language={language} />

      {replacing ? (
        <ReplaceSheet order={order} language={language} />
      ) : clearingFlag ? (
        <ClearFlagSheet order={order} language={language} />
      ) : reassigning ? (
        <Card className="ix-card--step">
          <form method="post" action={`/api/x/orders/${order.id}/reassign`}>
            <label htmlFor="reassign-store" className="ix-label">
              {L('reassignToStore', language)}
            </label>
            <select id="reassign-store" name="toStoreId" required className="ix-input">
              {stores
                .filter((s) => s.id !== order.store)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.area ? `(${s.area})` : ''}
                  </option>
                ))}
            </select>
            <div className="ix-actions">
              <SubmitButton>{L('reassignSubmit', language)}</SubmitButton>
              <QuietLink href={`/admin/orders/${order.id}`}>{L('cancelSheet', language)}</QuietLink>
            </div>
          </form>
        </Card>
      ) : cancelling ? (
        <Card className="ix-card--step">
          <form method="post" action={`/api/x/orders/${order.id}/move`}>
            <input type="hidden" name="to" value="cancelled" />
            <label htmlFor="cancel-reason" className="ix-label">
              {L('cancelReasonLabel', language)}
            </label>
            <textarea
              id="cancel-reason"
              name="reason"
              required
              maxLength={500}
              className="ix-input ix-input--area"
            />
            <div className="ix-actions">
              <SubmitButton variant="danger">{L('cancelSubmit', language)}</SubmitButton>
              <QuietLink href={`/admin/orders/${order.id}`}>{L('cancelSheet', language)}</QuietLink>
            </div>
          </form>
        </Card>
      ) : (
        <div className="ix-actions ix-actions--bar">
          {step.forward && (
            <form method="post" action={`/api/x/orders/${order.id}/move`}>
              <input type="hidden" name="to" value={step.forward.to} />
              <SubmitButton>{ORDER_STATUS_LABELS[step.forward.to]?.[language]}</SubmitButton>
            </form>
          )}
          {step.backward && (
            <form method="post" action={`/api/x/orders/${order.id}/move`}>
              <input type="hidden" name="to" value={step.backward} />
              <SubmitButton variant="quiet">
                {ORDER_STATUS_LABELS[step.backward]?.[language]}
              </SubmitButton>
            </form>
          )}
          {step.canReassign && (
            <BigButton href={`/admin/orders/${order.id}?reassign=1`} variant="quiet">
              {L('reassign', language)}
            </BigButton>
          )}
          {step.canReplace && (
            <BigButton href={`/admin/orders/${order.id}?replace=1`} variant="quiet">
              {L('replaceDamaged', language)}
            </BigButton>
          )}
          {step.canClearFlag && (
            <BigButton href={`/admin/orders/${order.id}?clearflag=1`} variant="quiet">
              {L('clearFlag', language)}
            </BigButton>
          )}
          {step.canCancel && (
            <BigButton href={`/admin/orders/${order.id}?cancel=1`} variant="danger">
              {L('cancelOrder', language)}
            </BigButton>
          )}
        </div>
      )}
    </main>
  )
}
