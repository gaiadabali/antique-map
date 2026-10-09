/**
 * The import report as the owner reads it (TASKS.md 10.8.a; DATA.md §4): the five counts, then
 * the rows that change stock (each old and new value), then the rows that were not accepted with
 * their column, problem and fix. Rendered by `./client.jsx`; the report's text is the importer's.
 */
import { L } from './copy'

const COUNTS = [
  ['new', 'countNew'],
  ['updated', 'countUpdated'],
  ['unchanged', 'countUnchanged'],
  ['rejected', 'countRejected'],
  ['held', 'countHeld'],
]

const list = { margin: '8px 0 16px', paddingLeft: 20 }

function Changes({ rows, language }) {
  return (
    <ul style={list}>
      {rows.map((row) => (
        <li key={row.row}>
          {L('rowLabel', language)} {row.row} ({row.key})
          {row.outcome === 'new'
            ? `: ${L('countNew', language)}`
            : `: ${(row.changes ?? []).map((c) => `${c.column} ${c.was} → ${c.now}`).join('; ')}`}
        </li>
      ))}
    </ul>
  )
}

function Problems({ rows, language }) {
  return (
    <ul style={list}>
      {rows.map((row) => (
        <li key={row.row} style={{ color: 'var(--theme-error-750)' }}>
          {L('rowLabel', language)} {row.row} ({row.key}):
          {row.column ? ` ${row.column}:` : ''} {row.problem}
          {row.fix ? ` ${row.fix}` : ''}
        </li>
      ))}
    </ul>
  )
}

export function Report({ report, applied, language }) {
  const toChange = report.rows.filter((row) => row.outcome === 'new' || row.outcome === 'updated')
  const refused = report.rows.filter((row) => row.outcome === 'rejected' || row.outcome === 'held')
  const changes = report.counts.new + report.counts.updated
  return (
    <section aria-label={L(applied ? 'appliedTitle' : 'previewTitle', language)}>
      <h2>{L(applied ? 'appliedTitle' : 'previewTitle', language)}</h2>
      <p style={{ color: 'var(--theme-elevation-600)' }}>{report.file}</p>
      <ul style={{ display: 'flex', gap: 20, flexWrap: 'wrap', listStyle: 'none', padding: 0 }}>
        {COUNTS.map(([outcome, key]) => (
          <li key={outcome}>
            <strong style={{ fontSize: 22 }}>{report.counts[outcome]}</strong>
            <div>{L(key, language)}</div>
          </li>
        ))}
      </ul>
      {!applied && changes === 0 ? <p>{L('nothingToApply', language)}</p> : null}
      {toChange.length > 0 ? (
        <>
          <h3>{L('rowsToChange', language)}</h3>
          <Changes rows={toChange} language={language} />
        </>
      ) : null}
      {refused.length > 0 ? (
        <>
          <h3>{L('rowsRejected', language)}</h3>
          <p>{L('rejectedNote', language)}</p>
          <Problems rows={refused} language={language} />
        </>
      ) : null}
      {report.truncated ? <p>{L('truncated', language)}</p> : null}
    </section>
  )
}
