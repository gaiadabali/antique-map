/**
 * The dashboard's small building blocks (server components, no state): a panel card, a number with
 * its delta, a ranked list, a bar row. `.jsx` for the same reason as `../widgets/dashboard.jsx`
 * (the cms package does not type-check React). Looks come from `ix-*` classes in
 * `app/(payload)/admin/panels.css`, which read the admin's tokens; no colour or font is set here.
 * The one inline style is a bar's width, which is the data itself.
 */
import { compared } from './compare'
import { deltaText, formatNumber } from './format'
import { text } from './copy'

export function Panel({ title, note, children }) {
  return (
    <section className="ix-card ix-panel">
      <h2 className="ix-panel__title">{title}</h2>
      {note ? <p className="ix-muted">{note}</p> : null}
      {children}
    </section>
  )
}

export function Empty({ message }) {
  return <p className="ix-muted">{message}</p>
}

/** A number with its delta against the period before. `format` turns the number into words. */
export function Stat({ label, value, language, format, digits = 0 }) {
  const shown = format ? format(value.current) : formatNumber(value.current, language, digits)
  return (
    <div className="ix-stat">
      <div className="ix-muted">{label}</div>
      <div className="ix-stat__big">{shown}</div>
      <div className="ix-muted">{deltaText(value, language, digits)}</div>
    </div>
  )
}

/**
 * A ranked list: each row's label and its count, with the delta. `label` maps the row's key to
 * words (a channel, a device); a row's `href` makes it a link.
 */
export function Ranked({ rows, language, label, empty }) {
  if (!rows || rows.length === 0) return <Empty message={empty ?? text(language, 'noList')} />
  const top = Math.max(...rows.map((r) => r.current), 1)
  return (
    <table className="ix-table">
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td className="ix-cell">
              {row.href ? (
                <a href={row.href}>{label ? label(row.key) : row.key}</a>
              ) : label ? (
                label(row.key)
              ) : (
                row.key
              )}
              <div className="ix-track" aria-hidden="true">
                <div
                  className="ix-track__fill"
                  style={{ width: `${(row.current / top) * 100}%` }}
                />
              </div>
            </td>
            <td className="ix-cell ix-cell--num">
              {formatNumber(row.current, language)}
              <div className="ix-muted">
                {deltaText(compared(row.current, row.previous), language)}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * A ranked list of money (`compare.ts`'s `MoneyRanked`): each row's key, its order count and its
 * revenue. No delta and no previous period — these are a breakdown of the current period's total,
 * not a number tracked over time.
 */
export function RankedMoney({ rows, language, label, formatMoney, empty }) {
  if (!rows || rows.length === 0) return <Empty message={empty ?? text(language, 'noList')} />
  const top = Math.max(...rows.map((r) => r.revenue), 1)
  return (
    <table className="ix-table">
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td className="ix-cell">
              {label ? label(row.key) : row.key}
              <div className="ix-track" aria-hidden="true">
                <div
                  className="ix-track__fill"
                  style={{ width: `${(row.revenue / top) * 100}%` }}
                />
              </div>
            </td>
            <td className="ix-cell ix-cell--num">
              {formatMoney(row.revenue)}
              <div className="ix-muted">{formatNumber(row.orders, language)}</div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
