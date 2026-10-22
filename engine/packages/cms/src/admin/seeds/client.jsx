'use client'
/**
 * The seed buttons: one card per seed, Run posts `{ action }` to `POST /api/x/seed`, then the
 * screen asks `GET /api/x/seed` every few seconds until the run ends and shows its report. On
 * production the server answers that seeds are not allowed, and the buttons are off. Styled by
 * `ix-*` classes in `app/(payload)/admin/panels.css`.
 */
import { useCallback, useEffect, useState } from 'react'

import { L } from './copy'

const ACTIONS = [
  { action: 'vocabulary', title: 'vocabularyTitle', body: 'vocabularyBody' },
  { action: 'shop-catalogue', title: 'catalogueTitle', body: 'catalogueBody' },
  { action: 'shop-pages', title: 'pagesTitle', body: 'pagesBody' },
  { action: 'pictures', title: 'picturesTitle', body: 'picturesBody' },
]

async function call(method, body) {
  const response = await globalThis.fetch('/api/x/seed', {
    method,
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, json }
}

export function SeedsClient({ language }) {
  const [allowed, setAllowed] = useState(true)
  const [state, setState] = useState(null)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const { ok, json } = await call('GET')
      if (ok) {
        setAllowed(json.allowed !== false)
        setState(json.state ?? null)
      }
    } catch {
      // the next poll tries again
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const running = state?.status === 'running'
  useEffect(() => {
    if (!running) return undefined
    const timer = globalThis.setInterval(() => void refresh(), 3000)
    return () => globalThis.clearInterval(timer)
  }, [running, refresh])

  async function run(action) {
    setError(null)
    try {
      const { ok, status, json } = await call('POST', { action })
      if (ok) setState(json.state)
      else if (status === 409) {
        setError('busy')
        if (json.state) setState(json.state)
      } else if (json.code === 'production') {
        setAllowed(false)
      } else setError('errorFailed')
    } catch {
      setError('errorFailed')
    }
  }

  if (!allowed) {
    return (
      <p role="alert" className="ix-notice ix-notice--error">
        {L('refusalProduction', language)}
      </p>
    )
  }
  return (
    <div>
      {ACTIONS.map((each) => (
        <div key={each.action} className="ix-card">
          <h2 className="ix-card__title">{L(each.title, language)}</h2>
          <p className="ix-muted">{L(each.body, language)}</p>
          <div className="ix-actions">
            <button
              type="button"
              className="ix-btn ix-btn--primary"
              disabled={running}
              onClick={() => run(each.action)}
            >
              {L('run', language)}
            </button>
          </div>
        </div>
      ))}
      {error ? (
        <p role="alert" className="ix-notice ix-notice--error">
          {L(error, language)}
        </p>
      ) : null}
      {state ? <RunReport state={state} language={language} /> : null}
    </div>
  )
}

function RunReport({ state, language }) {
  const title = ACTIONS.find((each) => each.action === state.action)?.title
  const heading =
    state.status === 'running'
      ? L('running', language)
      : state.status === 'failed'
        ? L('failed', language)
        : L('done', language)
  return (
    <div
      className="ix-card"
      role="status"
      aria-live="polite"
      aria-busy={state.status === 'running'}
    >
      <h2 className="ix-card__title">
        {L('lastRun', language)}: {title ? L(title, language) : state.action}
      </h2>
      <p className={state.status === 'failed' ? 'ix-notice ix-notice--error' : 'ix-strong'}>
        {heading}
      </p>
      {state.lines.length > 0 ? <pre className="ix-pre">{state.lines.join('\n')}</pre> : null}
    </div>
  )
}
