'use client'
/**
 * The button itself: posts `{ workId }` to `/api/x/draft` (same origin, the admin's own cookie),
 * shows that it is working, then what was filled and what was left — or the refusal in plain
 * words. The drafted values land in a new draft version, so the page reloads to show them. Styled
 * by the admin's stylesheets (TASKS.md 16): the `.ix-ai*` classes in `theme-record.css`.
 */
import { useState } from 'react'

import { DRAFT_COPY, fieldName, REFUSAL_COPY, SKIP_COPY } from '../copy'

// The admin's panel classes (`app/(payload)/admin/theme-record.css`, `.ix-ai*`): paper with a
// hairline, the one bronze action, muted status lines. Presentation only; the flow is unchanged.

function Refusal({ code, language }) {
  const words = REFUSAL_COPY[code] ?? REFUSAL_COPY.unavailable
  return (
    <p role="alert" className="ix-ai__error">
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
      <p className="ix-ai__done">{DRAFT_COPY.done[language]}</p>
      <p className="ix-ai__line">
        {result.filled.length === 0
          ? DRAFT_COPY.none[language]
          : `${DRAFT_COPY.filled[language]}: ${result.filled.map((f) => fieldName(f, language)).join(', ')}`}
      </p>
      {result.skipped.length > 0 ? (
        <ul className="ix-ai__list">
          {result.skipped.map(({ field, reason }) => (
            <li key={field}>
              {fieldName(field, language)} — {SKIP_COPY[reason]?.[language] ?? reason}
            </li>
          ))}
        </ul>
      ) : null}
      {description ? (
        <div className="ix-ai__quiet">
          <strong>{DRAFT_COPY.description[language]}</strong>
          <p className="ix-ai__preview">{description[language] ?? description.en}</p>
        </div>
      ) : null}
      {unmatched.length > 0 ? (
        <p className="ix-ai__quiet">
          {DRAFT_COPY.unmatched[language]}: {unmatched.join(', ')}
        </p>
      ) : null}
      {result.filled.length > 0 ? (
        <button
          type="button"
          className="ix-ai__button"
          onClick={() => globalThis.location.reload()}
        >
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
    <div className="ix-ai">
      <p className="ix-ai__intro">{DRAFT_COPY.intro[language]}</p>
      {state.phase === 'done' ? null : (
        <button
          type="button"
          className="ix-ai__button"
          disabled={working}
          aria-busy={working}
          onClick={draft}
        >
          {DRAFT_COPY.button[language]}
        </button>
      )}
      {working ? (
        <p role="status" className="ix-ai__quiet">
          {DRAFT_COPY.working[language]}
        </p>
      ) : null}
      {state.phase === 'refused' ? <Refusal code={state.code} language={language} /> : null}
      {state.phase === 'done' ? <Result result={state.result} language={language} /> : null}
    </div>
  )
}
