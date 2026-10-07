'use client'
/**
 * The button itself: posts `{ workId }` to `/api/x/draft` (same origin, the admin's own cookie),
 * shows that it is working, then what was filled and what was left — or the refusal in plain
 * words. The drafted values land in a new draft version, so the page reloads to show them. Styled
 * with Payload's own CSS custom properties, as `../../admin/leads/shared.jsx`.
 */
import { useState } from 'react'

import { DRAFT_COPY, fieldName, REFUSAL_COPY, SKIP_COPY } from '../copy'

const box = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 8,
  padding: 12,
  marginBottom: 16,
  fontSize: 13,
  background: 'var(--theme-input-bg)',
}
const button = {
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid transparent',
  background: 'var(--theme-elevation-800)',
  color: 'var(--theme-elevation-0)',
  fontWeight: 600,
  cursor: 'pointer',
  minHeight: 36,
}
const quiet = { color: 'var(--theme-elevation-600)', margin: '8px 0' }

function Refusal({ code, language }) {
  const words = REFUSAL_COPY[code] ?? REFUSAL_COPY.unavailable
  return (
    <p role="alert" style={{ color: 'var(--theme-error-750)', margin: '8px 0' }}>
      {words[language]}
    </p>
  )
}

function Result({ result, language }) {
  const description = result.suggestions?.description
  const unmatched = [
    ...(result.suggestions?.unmatchedPlaces ?? []),
    ...(result.suggestions?.unmatchedSubjects ?? []),
  ]
  return (
    <div role="status">
      <p style={{ margin: '8px 0', fontWeight: 600 }}>{DRAFT_COPY.done[language]}</p>
      <p style={{ margin: '4px 0' }}>
        {result.filled.length === 0
          ? DRAFT_COPY.none[language]
          : `${DRAFT_COPY.filled[language]}: ${result.filled.map((f) => fieldName(f, language)).join(', ')}`}
      </p>
      {result.skipped.length > 0 ? (
        <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
          {result.skipped.map(({ field, reason }) => (
            <li key={field}>
              {fieldName(field, language)} — {SKIP_COPY[reason]?.[language] ?? reason}
            </li>
          ))}
        </ul>
      ) : null}
      {description ? (
        <div style={quiet}>
          <strong>{DRAFT_COPY.description[language]}</strong>
          <p style={{ whiteSpace: 'pre-wrap' }}>{description[language] ?? description.en}</p>
        </div>
      ) : null}
      {unmatched.length > 0 ? (
        <p style={quiet}>
          {DRAFT_COPY.unmatched[language]}: {unmatched.join(', ')}
        </p>
      ) : null}
      {result.filled.length > 0 ? (
        <button type="button" style={button} onClick={() => globalThis.location.reload()}>
          {DRAFT_COPY.reload[language]}
        </button>
      ) : null}
    </div>
  )
}

export function DraftButtonClient({ workId, language }) {
  const [state, setState] = useState({ phase: 'idle' })

  async function draft() {
    setState({ phase: 'working' })
    try {
      const response = await globalThis.fetch('/api/x/draft', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workId }),
      })
      const body = await response.json().catch(() => ({}))
      if (response.ok && body.ok) setState({ phase: 'done', result: body })
      else setState({ phase: 'refused', code: body.code ?? 'unavailable' })
    } catch {
      setState({ phase: 'refused', code: 'unavailable' })
    }
  }

  const working = state.phase === 'working'
  return (
    <div style={box}>
      <p style={{ margin: '0 0 8px' }}>{DRAFT_COPY.intro[language]}</p>
      {state.phase === 'done' ? null : (
        <button
          type="button"
          style={{ ...button, opacity: working ? 0.6 : 1 }}
          disabled={working}
          aria-busy={working}
          onClick={draft}
        >
          {DRAFT_COPY.button[language]}
        </button>
      )}
      {working ? (
        <p role="status" style={quiet}>
          {DRAFT_COPY.working[language]}
        </p>
      ) : null}
      {state.phase === 'refused' ? <Refusal code={state.code} language={language} /> : null}
      {state.phase === 'done' ? <Result result={state.result} language={language} /> : null}
    </div>
  )
}
