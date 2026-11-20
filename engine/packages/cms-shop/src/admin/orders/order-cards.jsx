/**
 * The order page's facts (TASKS.md 27.3.b): the buyer with a WhatsApp button, the items and the
 * money, where it goes (the pin as a Google Maps link — the admin loads nothing from a third party,
 * so no map image), the store with its own WhatsApp button, and the timeline. Read-only cards;
 * every action is `./order-page.jsx`'s. `.jsx`: see `./shared.jsx`'s header.
 */
import { ORDER_STATUS_LABELS } from '../../collections/orders/statuses'
import { googleMapsLink } from './data'
import { baliTime } from './inbox-view'
import { Card, L, rupiah } from './shared'

function WhatsAppButton({ href, children }) {
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noreferrer" className="ix-btn ix-btn--quiet">
      {children}
    </a>
  )
}

export function BuyerCard({ order, language, buyerWa }) {
  return (
    <Card>
      <h2 className="ix-card__title">{L('buyer', language)}</h2>
      <dl className="od-dl">
        <dt>{L('buyer', language)}</dt>
        <dd>{order.contact?.name}</dd>
        <dt>WhatsApp</dt>
        <dd className="ix-num">{order.contact?.whatsapp}</dd>
        <dt>Email</dt>
        <dd>{order.contact?.email}</dd>
      </dl>
      <div className="od-row ix-links">
        <WhatsAppButton href={buyerWa}>{L('whatsappToBuyer', language)}</WhatsAppButton>
      </div>
    </Card>
  )
}

export function ItemsCard({ order, language }) {
  const totals = order.totals ?? {}
  const fee =
    totals.deliveryFee == null
      ? L('deliveryToQuote', language)
      : totals.deliveryFee === 0
        ? L('deliveryFree', language)
        : rupiah(totals.deliveryFee)
  return (
    <Card>
      <h2 className="ix-card__title">{L('items', language)}</h2>
      {order.lines.map((line, i) => (
        <div key={line.id ?? i} className="ix-line">
          <span>
            {line.qty}× {line.name}
            {line.variantLabel ? ` — ${line.variantLabel}` : ''}
          </span>
          <span className="ix-num">{rupiah(line.lineTotal)}</span>
        </div>
      ))}
      {Number(totals.discount) > 0 && (
        <div className="ix-line">
          <span>
            {L('discount', language)}
            {order.discount?.code ? ` (${order.discount.code})` : ''}
          </span>
          <span className="ix-num">−{rupiah(totals.discount)}</span>
        </div>
      )}
      <div className="ix-line">
        <span>{L('deliveryFee', language)}</span>
        <span className="ix-num">{fee}</span>
      </div>
      <div className="ix-line ix-line--total">
        <span>{L('total', language)}</span>
        <span className="ix-num">{rupiah(totals.total)}</span>
      </div>
      {order.status === 'pending_payment' && order.expiresAt && (
        <p className="ix-muted">
          {L('payBy', language).replace('{time}', baliTime(order.expiresAt, language))}
        </p>
      )}
    </Card>
  )
}

export function DeliveryCard({ order, language }) {
  const { lat, lng } = order.delivery ?? {}
  const pinned = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
  return (
    <Card>
      <h2 className="ix-card__title">{L('deliverTo', language)}</h2>
      <p className="ix-pre">{order.delivery?.address}</p>
      {order.delivery?.notes && (
        <p>
          <strong>{L('driverNotes', language)}:</strong> {order.delivery.notes}
        </p>
      )}
      {order.giftNote && (
        <p>
          <strong>{L('giftNote', language)}:</strong> {order.giftNote}
        </p>
      )}
      {pinned && (
        <dl className="od-dl">
          <dt>{L('pinCoordinates', language)}</dt>
          <dd className="ix-num">
            {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
            {order.distanceKm != null &&
              ` · ${L('distanceFromStore', language).replace('{km}', order.distanceKm)}`}
          </dd>
        </dl>
      )}
      {pinned && (
        <div className="od-row ix-links">
          <a
            href={googleMapsLink(lat, lng)}
            target="_blank"
            rel="noreferrer"
            className="ix-btn ix-btn--quiet"
          >
            {L('pinOnMap', language)}
          </a>
        </div>
      )}
    </Card>
  )
}

export function StoreCard({ order, store, storeWa, language }) {
  const name = store?.name ?? order.storeSnapshot?.name ?? '—'
  const area = store?.area ?? order.storeSnapshot?.area
  return (
    <Card>
      <h2 className="ix-card__title">{L('store', language)}</h2>
      <p>
        <strong>{name}</strong>
        {area ? ` · ${area}` : ''}
      </p>
      {storeWa ? (
        <div className="od-row ix-links">
          <WhatsAppButton href={storeWa}>{L('whatsappToStore', language)}</WhatsAppButton>
        </div>
      ) : (
        store && <p className="ix-muted">{L('storeNoWhatsapp', language)}</p>
      )}
    </Card>
  )
}

function moveLabel(entry, language) {
  if (!entry.from) return L('timelinePlaced', language)
  // A record without a move — the driver's photo, a store change, a note: its note says what.
  if (entry.from === entry.to) return L('timelineUpdate', language)
  return ORDER_STATUS_LABELS[entry.to]?.[language] ?? entry.to
}

export function Timeline({ order, language }) {
  const history = Array.isArray(order.history) ? order.history : []
  if (history.length === 0) return null
  return (
    <Card>
      <h2 className="ix-card__title">{L('timeline', language)}</h2>
      <ol className="od-timeline">
        {history.map((entry, i) => (
          <li key={entry.id ?? i}>
            <strong>{moveLabel(entry, language)}</strong>
            <time dateTime={entry.at}>
              {baliTime(entry.at, language)} ·{' '}
              {entry.actor === 'system'
                ? L('timelineSystem', language)
                : L('timelineStaff', language)}
            </time>
            {entry.note && <span className="od-note">{entry.note}</span>}
          </li>
        ))}
      </ol>
    </Card>
  )
}
