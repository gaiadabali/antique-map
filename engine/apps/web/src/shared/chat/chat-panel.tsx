'use client'

/**
 * The chat panel (8.2.a/b): opens Turnstile invisibly, starts the session, streams the turn's
 * events through the reducer, and renders the handoff and lead-form states the stream can end in
 * (AI.md §2.2–§4). Focus moves into the panel on open and Escape closes it — the launcher restores
 * focus to whatever opened it. The panel's JavaScript is loaded only when the launcher mounts it
 * (`next/dynamic`, `ssr: false`), so a page that never opens the chat ships none of it.
 */
import { usePathname } from 'next/navigation'
import { useEffect, useReducer, useRef, useState } from 'react'

import { ChatShell } from '../ui/chat-shell'
import { Button } from '../ui/button'
import { chatReducer, INITIAL_CHAT_STATE } from './chat-reducer'
import { ChatDisclosure } from './chat-disclosure'
import { ChatEntries } from './chat-entries'
import { ConsentForm } from './consent-form'
import { sendChatMessage, startChatSession, type StreamHandle } from './chat-client'
import { useChatPageInfo } from './chat-page-context'
import { isEscapeKey } from './keys'
import type { ChatPanelText } from './lexicon/types'
import type { SiteKey, SiteLocale } from './types'
import { ChatTurnstile } from './turnstile-widget'

export type ChatPanelProps = {
  readonly site: SiteKey
  readonly locale: SiteLocale
  readonly origin: string
  readonly turnstileSiteKey: string | null
  readonly text: ChatPanelText
  readonly suggestions: readonly string[]
  readonly onClose: () => void
}

const DEFAULT_MAX_CHARS = 1000

export function ChatPanel({
  locale,
  origin,
  turnstileSiteKey,
  text,
  suggestions,
  onClose,
}: ChatPanelProps): React.ReactElement {
  const pathname = usePathname()
  const pageInfo = useChatPageInfo()
  const [session, setSession] = useState<'starting' | 'ready' | 'failed'>(
    turnstileSiteKey === null ? 'failed' : 'starting',
  )
  // The server's own words when a session cannot start (e.g. "rate_limited"); else the generic line.
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [maxChars, setMaxChars] = useState(DEFAULT_MAX_CHARS)
  const [state, dispatch] = useReducer(chatReducer, INITIAL_CHAT_STATE)
  const [composer, setComposer] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<StreamHandle | null>(null)
  const askedToken = useRef(false)

  useEffect(() => {
    const first = rootRef.current?.querySelector<HTMLElement>('input, button, textarea')
    first?.focus()
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (isEscapeKey(event)) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function onToken(token: string): void {
    if (askedToken.current) return
    askedToken.current = true
    void startChatSession({ turnstileToken: token, locale }).then((result) => {
      if (result.ok) {
        setSession('ready')
        if (!result.resumed) setMaxChars(result.limits.maxMessageChars)
      } else {
        setSessionError(result.message.trim() || null)
        setSession('failed')
      }
      askedToken.current = false
    })
  }

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const value = composer.trim()
    if (value === '' || state.streaming || session !== 'ready') return
    dispatch({ type: 'send', text: value })
    setComposer('')
    streamRef.current = sendChatMessage(
      { text: value, locale, pagePath: pathname ?? '/' },
      (chatEvent) => dispatch({ type: 'event', event: chatEvent }),
      (seconds) => dispatch({ type: 'retryAfter', seconds }),
      () => dispatch({ type: 'networkError', message: text.networkError }),
    )
  }

  const errorText =
    state.errorMessage === null
      ? null
      : state.retryAfterSeconds !== null
        ? `${state.errorMessage} ${text.errorRetryIn.replace('{seconds}', String(state.retryAfterSeconds))}`
        : state.errorMessage

  return (
    <div ref={rootRef}>
      <ChatShell
        title={
          pageInfo !== null ? text.askingAbout.replace('{title}', pageInfo.title) : text.panelTitle
        }
        closeLabel={text.close}
        onClose={onClose}
        disclosure={<ChatDisclosure text={text} privacyHref="/privacy" />}
        composer={
          <form onSubmit={submit}>
            <label htmlFor="chat-composer">{text.composerLabel}</label>
            <textarea
              id="chat-composer"
              value={composer}
              maxLength={maxChars}
              placeholder={text.composerPlaceholder}
              disabled={session !== 'ready'}
              onChange={(event) => setComposer(event.target.value)}
            />
            {state.streaming ? (
              <Button type="button" variant="secondary" onClick={() => streamRef.current?.stop()}>
                {text.stop}
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                disabled={session !== 'ready' || composer.trim() === ''}
              >
                {text.send}
              </Button>
            )}
          </form>
        }
      >
        {state.entries.length === 0 && (
          <ul>
            {suggestions.map((suggestion) => (
              <li key={suggestion}>
                <button type="button" onClick={() => setComposer(suggestion)}>
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        )}
        <ChatEntries
          entries={state.entries}
          origin={origin}
          handoffLabels={{ whatsapp: text.handoffWhatsapp, email: text.handoffEmail }}
        />
        {state.leadForm !== null && !state.leadFormOpen && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => dispatch({ type: 'openLeadForm' })}
          >
            {text.leadCta}
          </Button>
        )}
        {state.leadForm !== null && state.leadFormOpen && (
          <ConsentForm
            form={state.leadForm}
            text={text}
            locale={locale}
            onSubmitted={(reference) => dispatch({ type: 'leadSubmitted', reference })}
            onCancel={() => dispatch({ type: 'closeLeadForm' })}
          />
        )}
        {state.leadReference !== null && (
          <p>{text.leadSuccess.replace('{reference}', state.leadReference)}</p>
        )}
        {errorText !== null && <p role="alert">{errorText}</p>}
        {session === 'failed' && <p role="alert">{sessionError ?? text.networkError}</p>}
      </ChatShell>
      {turnstileSiteKey !== null && session === 'starting' && (
        <ChatTurnstile siteKey={turnstileSiteKey} onToken={onToken} />
      )}
    </div>
  )
}
