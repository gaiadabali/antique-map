/**
 * The owner and editor's two actions of TASKS.md 10.7 on the order screen — **Replace damaged
 * item** on a delivered order (CONTENT-OPERATIONS.md §5.5) and **Clear the flag** (runbook §7) —
 * and the links between a replacement and its original. Plain forms posting to the orders
 * collection's endpoints (`collections/orders/endpoints.ts`); the fulfilment core decides, this
 * only asks. `.jsx`: see `shared.jsx`'s header.
 */
import { ORDER_STATUS_LABELS } from '../../collections/orders/statuses'
import { Card, L, QuietLink, SubmitButton, rupiah } from './shared'

const field = { width: '100%', display: 'block', margin: '8px 0', minHeight: 44, fontSize: 16 }
const row = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
  padding: '8px 0',
  borderBottom: '1px solid var(--theme-elevation-100)',
}

/** The order's items, as every order screen shows them. */
export function LinesCard({ order, language }) {
  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>{L('items', language)}</h3>
      {order.lines.map((line, i) => (
        <div
          key={line.id ?? i}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 14,
            padding: '4px 0',
          }}
        >
          <span>
            {line.qty}× {line.name}
            {line.variantLabel ? ` — ${line.variantLabel}` : ''}
          </span>
          <span>{rupiah(line.lineTotal)}</span>
        </div>
      ))}
    </Card>
  )
}

/** Tick the damaged lines, how many of each, a one-line note, Confirm. */
export function ReplaceSheet({ order, language }) {
  const store = order.storeSnapshot?.name ?? '—'
  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>{L('replaceDamaged', language)}</h3>
      <p style={{ fontSize: 14 }}>{L('replaceHint', language).replace('{store}', store)}</p>
      <form method="post" action={`/api/orders/${order.id}/replace`}>
        {order.lines.map((line) => (
          <div key={line.id} style={row}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minHeight: 44,
                flex: '1 1 200px',
              }}
            >
              <input
                type="checkbox"
                name="line"
                value={line.id}
                style={{ width: 24, height: 24 }}
              />
              <span>
                {line.name}
                {line.variantLabel ? ` — ${line.variantLabel}` : ''}
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {L('replaceQty', language)}
              <select
                name={`qty_${line.id}`}
                defaultValue={String(line.qty)}
                style={{ minHeight: 44, fontSize: 16 }}
              >
                {Array.from({ length: line.qty }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
        <label htmlFor="replace-note" style={{ display: 'block', marginTop: 12 }}>
          {L('replaceNoteLabel', language)}
        </label>
        <input
          id="replace-note"
          name="note"
          type="text"
          required
          maxLength={200}
          placeholder={L('replaceNotePlaceholder', language)}
          style={field}
        />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
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
    <Card>
      <form method="post" action={`/api/orders/${order.id}/clear-flag`}>
        <label htmlFor="clear-flag-note">{L('clearFlagNoteLabel', language)}</label>
        <input
          id="clear-flag-note"
          name="note"
          type="text"
          required
          maxLength={200}
          placeholder={L('clearFlagNotePlaceholder', language)}
          style={field}
        />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <SubmitButton>{L('clearFlagSubmit', language)}</SubmitButton>
          <QuietLink href={`/admin/orders/${order.id}`}>{L('cancelSheet', language)}</QuietLink>
        </div>
      </form>
    </Card>
  )
}

const linkTo = (linked, language) => (
  <a key={linked.id} href={`/admin/orders/${linked.id}`} style={{ marginRight: 12 }}>
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
      {isReplacement && (
        <p style={{ margin: 0, fontWeight: 600 }}>{L('replacementBadge', language)}</p>
      )}
      {linked?.original && (
        <p style={{ margin: '8px 0 0' }}>
          {L('replacementOf', language)}: {linkTo(linked.original, language)}
        </p>
      )}
      {replacements.length > 0 && (
        <p style={{ margin: '8px 0 0' }}>
          {L('replacedBy', language)}: {replacements.map((r) => linkTo(r, language))}
        </p>
      )}
    </Card>
  )
}
