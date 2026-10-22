/**
 * The "Send price" panel for an `awaiting_quote` order (TASKS.md 6.6.c): a rupiah fee, posting to
 * the shell's `/api/x/orders/quote` (mounting the core's `quoteDeliveryFee`, `6.6-core`), and a
 * WhatsApp button prefilled with the order number and the buyer's own order-page link (`payLink`,
 * `./data`'s `loadOrderPayLink` — already decrypted server-side, never stored here beyond the
 * button's `href`). `.jsx`: see `shared.jsx`'s header.
 */
import { Card, L, SubmitButton } from './shared'
import { whatsappLink } from './data'

/** "14:30" in Bali time (Asia/Makassar, UTC+8) — the quote or payment deadline. */
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

export function QuotePanel({ order, language, payLink }) {
  const deadline = baliClock(order.expiresAt)
  const whatsapp = order.contact?.whatsapp
  const message = [L('whatsappOrderMessage', language), `#${order.number}`, payLink]
    .filter(Boolean)
    .join(' — ')

  return (
    <Card className="ix-card--step">
      <h2 className="ix-card__title">{L('sendPriceTitle', language)}</h2>
      {deadline && (
        <p className="ix-muted">
          {L('quoteByPrefix', language)} {deadline}
        </p>
      )}
      <form method="post" action="/api/x/orders/quote" className="ix-inline-form">
        <input type="hidden" name="orderId" value={order.id} />
        <label htmlFor={`fee-${order.id}`} className="ix-label">
          {L('sendPriceLabel', language)}
          <input
            id={`fee-${order.id}`}
            name="feeIdr"
            type="number"
            min="0"
            step="1"
            required
            inputMode="numeric"
            className="ix-input ix-input--fee"
          />
        </label>
        <SubmitButton>{L('sendPriceSubmit', language)}</SubmitButton>
      </form>
      <p className="ix-muted">{L('sendPriceHint', language)}</p>
      {whatsapp && (
        <a
          href={whatsappLink(whatsapp, message)}
          target="_blank"
          rel="noreferrer"
          className="ix-btn ix-btn--quiet"
        >
          {L('whatsappOrderLink', language)}
        </a>
      )}
    </Card>
  )
}
