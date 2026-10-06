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
    <Card>
      <h3 style={{ marginTop: 0 }}>{L('sendPriceTitle', language)}</h3>
      {deadline && (
        <p style={{ fontSize: 14, color: 'var(--theme-elevation-600)' }}>
          {L('quoteByPrefix', language)} {deadline}
        </p>
      )}
      <form
        method="post"
        action="/api/x/orders/quote"
        style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}
      >
        <input type="hidden" name="orderId" value={order.id} />
        <label htmlFor={`fee-${order.id}`} style={{ fontSize: 14 }}>
          {L('sendPriceLabel', language)}
          <input
            id={`fee-${order.id}`}
            name="feeIdr"
            type="number"
            min="0"
            step="1"
            required
            style={{ display: 'block', marginTop: 4, minHeight: 36, minWidth: 140 }}
          />
        </label>
        <SubmitButton>{L('sendPriceSubmit', language)}</SubmitButton>
      </form>
      <p style={{ fontSize: 13, color: 'var(--theme-elevation-600)', marginTop: 8 }}>
        {L('sendPriceHint', language)}
      </p>
      {whatsapp && (
        <a
          href={whatsappLink(whatsapp, message)}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'inline-block', marginTop: 8 }}
        >
          {L('whatsappOrderLink', language)}
        </a>
      )}
    </Card>
  )
}
