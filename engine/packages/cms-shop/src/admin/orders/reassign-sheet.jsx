/**
 * Reassign (TASKS.md 27.3.c; COMMERCE.md §4 "Staff reassignment"): the other active stores that
 * hold every item of the order, nearest the buyer's pin first (at most 12), each with its distance,
 * and how many others lack an item — and a reason, required. Posts to the shell's
 * `/api/x/orders/{id}/reassign`, which runs `reassignOrder`: the stock moves atomically there, and
 * a store that cannot fill the order after all is refused with nothing changed. The packing slip
 * (the plan's K6) is `PackingSlip`, below: optional, printed from the browser.
 * `.jsx`: see `./shared.jsx`'s header.
 */
import { PrintButton } from './styles-client'
import { Card, L, QuietLink, SubmitButton } from './shared'

/** At most this many stores are offered: the nearest that hold every item. */
const SHOWN = 12

export function ReassignSheet({ order, options, language }) {
  const holders = options.filter((option) => option.holdsAll).slice(0, SHOWN)
  const others = options.filter((option) => !option.holdsAll).length
  const first = holders[0]?.id
  return (
    <Card className="ix-card--step">
      <h2 className="ix-card__title">{L('reassignTitle', language)}</h2>
      <p className="ix-muted">{L('reassignHint', language)}</p>
      <form method="post" action={`/api/x/orders/${order.id}/reassign`}>
        <fieldset className="od-stores">
          <legend className="ix-label">{L('reassignToStore', language)}</legend>
          {holders.map((option) => (
            <label key={option.id} className="od-store">
              <input
                type="radio"
                name="toStoreId"
                value={option.id}
                required
                defaultChecked={option.id === first}
              />
              <span className="od-store__text">
                <strong>{option.name}</strong>
                <span className="od-store__meta">
                  {option.area ? `${option.area} · ` : ''}
                  {L('distanceFromStore', language).replace('{km}', option.distanceKm)}
                </span>
              </span>
              <span className="ix-tag ix-tag--success">{L('holdsEveryItem', language)}</span>
            </label>
          ))}
        </fieldset>
        {holders.length === 0 && <p className="ix-muted">{L('reassignNone', language)}</p>}
        {others > 0 && (
          <p className="ix-muted">{L('reassignOthers', language).replace('{n}', others)}</p>
        )}
        <label htmlFor="reassign-reason" className="ix-label">
          {L('reassignReason', language)}
        </label>
        <textarea
          id="reassign-reason"
          name="reason"
          required
          minLength={3}
          maxLength={500}
          placeholder={L('reassignReasonPlaceholder', language)}
          className="ix-input ix-input--area"
        />
        <div className="ix-actions">
          {holders.length > 0 && <SubmitButton>{L('reassignSubmit', language)}</SubmitButton>}
          <QuietLink href={`/admin/orders/${order.id}`}>{L('cancelSheet', language)}</QuietLink>
        </div>
      </form>
    </Card>
  )
}

/** The packing slip: the order, who it goes to and the items to pack — never a price. */
export function PackingSlip({ order, store, language }) {
  return (
    <main className="ix-page od-slip">
      <div className="od-row od-noprint">
        <PrintButton>{L('packingSlipPrint', language)}</PrintButton>
        <QuietLink href={`/admin/orders/${order.id}`}>{L('packingSlipBack', language)}</QuietLink>
      </div>
      <h1 className="ix-record">
        {L('packingSlip', language)} · #{order.number}
      </h1>
      <dl className="od-dl">
        <dt>{L('buyer', language)}</dt>
        <dd>{order.contact?.name}</dd>
        <dt>WhatsApp</dt>
        <dd className="ix-num">{order.contact?.whatsapp}</dd>
        <dt>{L('deliverTo', language)}</dt>
        <dd className="ix-pre">{order.delivery?.address}</dd>
        {order.delivery?.notes && (
          <>
            <dt>{L('driverNotes', language)}</dt>
            <dd>{order.delivery.notes}</dd>
          </>
        )}
        <dt>{L('store', language)}</dt>
        <dd>{store?.name ?? order.storeSnapshot?.name ?? '—'}</dd>
      </dl>
      <table>
        <thead>
          <tr>
            <th scope="col">{L('packingSlipQty', language)}</th>
            <th scope="col">{L('packingSlipItem', language)}</th>
            <th scope="col">SKU</th>
            <th scope="col">{L('packingSlipChecked', language)}</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((line, i) => (
            <tr key={line.id ?? i}>
              <td className="ix-num">{line.qty}</td>
              <td>
                {line.name}
                {line.variantLabel ? ` — ${line.variantLabel}` : ''}
              </td>
              <td className="ix-num">{line.sku}</td>
              <td>
                <span className="od-box" aria-hidden="true" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {order.giftNote && (
        <p>
          <strong>{L('giftNote', language)}:</strong> {order.giftNote}
        </p>
      )}
    </main>
  )
}
