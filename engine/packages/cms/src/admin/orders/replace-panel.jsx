/**
 * The owner and editor's two actions of TASKS.md 10.7 on the order screen — **Replace damaged
 * item** on a delivered order (CONTENT-OPERATIONS.md §5.5) and **Clear the flag** (runbook §7) —
 * and the links between a replacement and its original. Plain forms posting to the orders
 * collection's endpoints (`collections/orders/endpoints.ts`); the fulfilment core decides, this
 * only asks. Styled by `ix-*` classes in `app/(payload)/admin/panels.css`. `.jsx`: see
 * `shared.jsx`'s header.
 */
import { ORDER_STATUS_LABELS } from '../../collections/orders/statuses'
import { Card, L, QuietLink, SubmitButton, rupiah } from './shared'

/** The order's items, as every order screen shows them. */
export function LinesCard({ order, language }) {
  return (
    <Card>
      <h3 className="ix-card__title">{L('items', language)}</h3>
      {order.lines.map((line, i) => (
        <div key={line.id ?? i} className="ix-line">
          <span>
            {line.qty}× {line.name}
            {line.variantLabel ? ` — ${line.variantLabel}` : ''}
          </span>
          <span className="ix-num">{rupiah(line.lineTotal)}</span>
        </div>
      ))}
    </Card>
  )
}

/** Tick the damaged lines, how many of each, a one-line note, Confirm. */
export function ReplaceSheet({ order, language }) {
  const store = order.storeSnapshot?.name ?? '—'
  return (
    <Card className="ix-card--step">
      <h3 className="ix-card__title">{L('replaceDamaged', language)}</h3>
      <p className="ix-muted">{L('replaceHint', language).replace('{store}', store)}</p>
      <form method="post" action={`/api/orders/${order.id}/replace`}>
        {order.lines.map((line) => (
          <div key={line.id} className="ix-pick">
            <label className="ix-pick__line">
              <input type="checkbox" name="line" value={line.id} className="ix-check" />
              <span>
                {line.name}
                {line.variantLabel ? ` — ${line.variantLabel}` : ''}
              </span>
            </label>
            <label className="ix-pick__qty">
              {L('replaceQty', language)}
              <select name={`qty_${line.id}`} defaultValue={String(line.qty)} className="ix-input">
                {Array.from({ length: line.qty }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
        <label htmlFor="replace-note" className="ix-label">
          {L('replaceNoteLabel', language)}
        </label>
        <input
          id="replace-note"
          name="note"
          type="text"
          required
          maxLength={200}
          placeholder={L('replaceNotePlaceholder', language)}
          className="ix-input"
        />
        <div className="ix-actions">
          <SubmitButton>{L('replaceSubmit', language)}</SubmitButton>
          <QuietLink href={`/admin/orders/${order.id}`}>{L('cancelSheet', language)}</QuietLink>
        </div>
      </form>
    </Card>
  )
}

/** A required note saying what was done, then the flag goes; the history keeps both. */
export function ClearFlagSheet({ order, language }) {
  return (
    <Card className="ix-card--step">
      <form method="post" action={`/api/orders/${order.id}/clear-flag`}>
        <label htmlFor="clear-flag-note" className="ix-label">
          {L('clearFlagNoteLabel', language)}
        </label>
        <input
          id="clear-flag-note"
          name="note"
          type="text"
          required
          maxLength={200}
          placeholder={L('clearFlagNotePlaceholder', language)}
          className="ix-input"
        />
        <div className="ix-actions">
          <SubmitButton>{L('clearFlagSubmit', language)}</SubmitButton>
          <QuietLink href={`/admin/orders/${order.id}`}>{L('cancelSheet', language)}</QuietLink>
        </div>
      </form>
    </Card>
  )
}

const linkTo = (linked, language) => (
  <a key={linked.id} href={`/admin/orders/${linked.id}`} className="ix-link ix-link--inline">
    #{linked.number} ({ORDER_STATUS_LABELS[linked.status]?.[language]})
  </a>
)

/** "Replacement — Rp 0", what it replaces, and what replaced it. Nothing when unlinked. */
export function ReplacementLinks({ order, linked, language }) {
  const isReplacement = order.channel === 'replacement'
  const replacements = linked?.replacements ?? []
  if (!isReplacement && replacements.length === 0) return null
  return (
    <Card>
      {isReplacement && <p className="ix-strong">{L('replacementBadge', language)}</p>}
      {linked?.original && (
        <p>
          {L('replacementOf', language)}: {linkTo(linked.original, language)}
        </p>
      )}
      {replacements.length > 0 && (
        <p>
          {L('replacedBy', language)}: {replacements.map((r) => linkTo(r, language))}
        </p>
      )}
    </Card>
  )
}
