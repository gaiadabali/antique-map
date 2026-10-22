'use client'
/**
 * The upload form (TASKS.md 10.8.a): choose a CSV, Preview (`mode=preview`, a dry run: nothing is
 * written), read the report, then Apply (`mode=apply`, the same file again). The file stays in the
 * browser between the two; the server keeps nothing. Styled by `ix-*` classes in
 * `app/(payload)/admin/panels.css`.
 */
import { useRef, useState } from 'react'

import { L, STOCK_IMPORT_COPY } from './copy'
import { Report } from './report'

async function post(file, mode) {
  const body = new globalThis.FormData()
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
        <div className="ix-card">
          <label htmlFor="stock-import-file" className="ix-label">
            {L('fileLabel', language)}
          </label>
          <input
            id="stock-import-file"
            ref={input}
            type="file"
            className="ix-input ix-input--file"
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
        <p role="alert" className="ix-notice ix-notice--error">
          {STOCK_IMPORT_COPY[error.code] ? L(error.code, language) : L('errorFailed', language)}
          {STOCK_IMPORT_COPY[error.fixCode] ? ` ${L(error.fixCode, language)}` : ''}
          {error.message ? ` ${error.message}` : ''}
          {error.fix ? ` ${error.fix}` : ''}
        </p>
      ) : null}
      <div className="ix-actions">
        {phase === 'applied' ? null : (
          <button
            type="button"
            className={`ix-btn ${phase === 'previewed' ? 'ix-btn--quiet' : 'ix-btn--primary'}`}
            disabled={working}
            onClick={() => run('preview')}
          >
            {L('preview', language)}
          </button>
        )}
        {phase === 'previewed' && changes > 0 ? (
          <button type="button" className="ix-btn ix-btn--primary" onClick={() => run('apply')}>
            {L('apply', language)}
          </button>
        ) : null}
        {phase === 'previewed' || phase === 'applied' ? (
          <button type="button" className="ix-btn ix-btn--quiet" onClick={reset}>
            {L('reset', language)}
          </button>
        ) : null}
      </div>
      {working ? (
        <p role="status" aria-busy="true" className="ix-muted">
          {L('working', language)}
        </p>
      ) : null}
      {report && !working ? (
        <Report report={report} applied={phase === 'applied'} language={language} />
      ) : null}
    </div>
  )
}
