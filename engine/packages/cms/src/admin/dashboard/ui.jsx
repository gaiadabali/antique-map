/**
 * The dashboard's small building blocks (server components, no state): a panel card, a number with
 * its delta, a ranked list, a bar row. `.jsx` for the same reason as `../widgets/dashboard.jsx`
 * (the cms package does not type-check React). Looks come from the admin's own theme variables
 * (`--theme-elevation-*`, `--base`), so a restyle of the admin restyles this; no colour or font
 * is set here.
 */
import { compared } from './compare'
import { deltaText, formatNumber } from './format'
import { text } from './copy'

export const S = {
  page: { padding: 'calc(var(--base) * 1.5)', maxWidth: '1280px', margin: '0 auto' },
  row: { display: 'flex', flexWrap: 'wrap', gap: 'var(--base)', alignItems: 'center' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
    gap: 'var(--base)',
    marginBlockStart: 'var(--base)',
  },
  card: {
    border: '1px solid var(--theme-elevation-150)',
    background: 'var(--theme-elevation-50)',
    borderRadius: 'var(--style-radius-m, 4px)',
    padding: 'var(--base)',
    minWidth: 0,
  },
  h2: { margin: 0, fontSize: '1.1rem' },
  h3: { margin: 'var(--base) 0 calc(var(--base) / 3)', fontSize: '0.9rem', opacity: 0.8 },
  muted: { opacity: 0.7, margin: '0.25rem 0' },
  stats: { display: 'flex', flexWrap: 'wrap', gap: 'var(--base)', marginBlockStart: 'var(--base)' },
  stat: { minWidth: '8rem' },
  big: { fontSize: '1.6rem', lineHeight: 1.2, fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
  cell: { padding: '0.25rem 0.5rem 0.25rem 0', textAlign: 'start', verticalAlign: 'top' },
  num: { padding: '0.25rem 0', textAlign: 'end', whiteSpace: 'nowrap' },
  track: { background: 'var(--theme-elevation-100)', height: '0.5rem', borderRadius: '2px' },
  tab: {
    padding: '0.4rem 0.9rem',
    border: '1px solid var(--theme-elevation-150)',
    borderRadius: '4px',
    textDecoration: 'none',
    color: 'inherit',
  },
  tabOn: { background: 'var(--theme-elevation-800)', color: 'var(--theme-elevation-0)' },
}

export function Panel({ title, note, children }) {
  return (
    <section style={S.card}>
      <h2 style={S.h2}>{title}</h2>
      {note ? <p style={S.muted}>{note}</p> : null}
      {children}
    </section>
  )
}

export function Empty({ message }) {
  return <p style={S.muted}>{message}</p>
}

/** A number with its delta against the period before. `format` turns the number into words. */
export function Stat({ label, value, language, format, digits = 0 }) {
  const shown = format ? format(value.current) : formatNumber(value.current, language, digits)
  return (
    <div style={S.stat}>
      <div style={S.muted}>{label}</div>
      <div style={S.big}>{shown}</div>
      <div style={S.muted}>{deltaText(value, language, digits)}</div>
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
    <table style={S.table}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td style={S.cell}>
              {row.href ? (
                <a href={row.href}>{label ? label(row.key) : row.key}</a>
              ) : label ? (
                label(row.key)
              ) : (
                row.key
              )}
              <div style={S.track} aria-hidden="true">
                <div
                  style={{
                    height: '100%',
                    width: `${(row.current / top) * 100}%`,
                    background: 'var(--theme-elevation-500)',
                  }}
                />
              </div>
            </td>
            <td style={S.num}>
              {formatNumber(row.current, language)}
              <div style={S.muted}>{deltaText(compared(row.current, row.previous), language)}</div>
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
    <table style={S.table}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td style={S.cell}>
              {label ? label(row.key) : row.key}
              <div style={S.track} aria-hidden="true">
                <div
                  style={{
                    height: '100%',
                    width: `${(row.revenue / top) * 100}%`,
                    background: 'var(--theme-elevation-500)',
                  }}
                />
              </div>
            </td>
            <td style={S.num}>
              {formatMoney(row.revenue)}
              <div style={S.muted}>{formatNumber(row.orders, language)}</div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
