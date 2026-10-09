'use client'
/**
 * The upload form (TASKS.md 10.8.a): choose a CSV, Preview (`mode=preview`, a dry run: nothing is
 * written), read the report, then Apply (`mode=apply`, the same file again). The file stays in the
 * browser between the two; the server keeps nothing. Styled with Payload's own CSS custom
 * properties, as `../leads/shared.jsx`.
 */
import { useRef, useState } from 'react'

import { L, STOCK_IMPORT_COPY } from './copy'
import { Report } from './report'

const button = {
  padding: '10px 16px',
  borderRadius: 8,
  border: '1px solid transparent',
  background: 'var(--theme-success-500)',
  color: 'var(--theme-base-0)',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  minHeight: 40,
}
const quietButton = {
  ...button,
  background: 'var(--theme-base-0)',
  color: 'var(--theme-elevation-800)',
  border: '1px solid var(--theme-elevation-300)',
}

async function post(file, mode) {
  const body = new FormData()
  body.set('file', file)
  body.set('mode', mode)
  const response = await globalThis.fetch('/api/stock-levels/import', {
    method: 'POST',
    credentials: 'same-origin',
    body,
  })
  const json = await response.json().catch(() => ({}))
  return { ok: response.ok, json }
}

export function StockImportClient({ language }) {
  const input = useRef(null)
  const [file, setFile] = useState(null)
  const [phase, setPhase] = useState('idle')
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)

  function reset() {
    setFile(null)
    setReport(null)
    setError(null)
    setPhase('idle')
    if (input.current) input.current.value = ''
  }

  async function run(mode) {
    const chosen = file ?? input.current?.files?.[0]
    if (!chosen) {
      setError({ code: 'errorNoFile' })
      return
    }
    setFile(chosen)
    setError(null)
    setPhase('working')
    try {
      const { ok, json } = await post(chosen, mode)
      if (ok && json.report) {
        setReport(json.report)
        setPhase(mode === 'apply' ? 'applied' : 'previewed')
      } else {
        setError({ code: json.code, fixCode: json.fixCode, message: json.error, fix: json.fix })
        setPhase('idle')
      }
    } catch {
      setError({ code: 'errorNetwork' })
      setPhase('idle')
    }
  }

  const working = phase === 'working'
  const changes = report ? report.counts.new + report.counts.updated : 0
  return (
    <div>
      {phase === 'applied' ? null : (
        <div style={{ margin: '16px 0' }}>
          <label htmlFor="stock-import-file" style={{ display: 'block', marginBottom: 6 }}>
            {L('fileLabel', language)}
          </label>
          <input
            id="stock-import-file"
            ref={input}
            type="file"
            accept=".csv,text/csv"
            disabled={working}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null)
              setReport(null)
              setError(null)
              setPhase('idle')
            }}
          />
        </div>
      )}
      {error ? (
        <p role="alert" style={{ color: 'var(--theme-error-750)' }}>
          {STOCK_IMPORT_COPY[error.code] ? L(error.code, language) : L('errorFailed', language)}
          {STOCK_IMPORT_COPY[error.fixCode] ? ` ${L(error.fixCode, language)}` : ''}
          {error.message ? ` ${error.message}` : ''}
          {error.fix ? ` ${error.fix}` : ''}
        </p>
      ) : null}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '12px 0' }}>
        {phase === 'applied' ? null : (
          <button
            type="button"
            style={{
              ...(phase === 'previewed' ? quietButton : button),
              opacity: working ? 0.6 : 1,
            }}
            disabled={working}
            onClick={() => run('preview')}
          >
            {L('preview', language)}
          </button>
        )}
        {phase === 'previewed' && changes > 0 ? (
          <button type="button" style={button} onClick={() => run('apply')}>
            {L('apply', language)}
          </button>
        ) : null}
        {phase === 'previewed' || phase === 'applied' ? (
          <button type="button" style={quietButton} onClick={reset}>
            {L('reset', language)}
          </button>
        ) : null}
      </div>
      {working ? (
        <p role="status" aria-busy="true">
          {L('working', language)}
        </p>
      ) : null}
      {report && !working ? (
        <Report report={report} applied={phase === 'applied'} language={language} />
      ) : null}
    </div>
  )
}
