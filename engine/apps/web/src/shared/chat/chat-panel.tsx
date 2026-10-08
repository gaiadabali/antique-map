'use client'

/**
 * The chat panel (8.2.a/b/c): a customer-service messenger. Opens Turnstile invisibly, starts the
 * session, streams the turn's events through the reducer, and renders the handoff and lead-form
 * states the stream can end in (AI.md �2.2��4). Focus moves into the panel on open and Escape closes
 * it � the launcher restores focus to whatever opened it. The panel's JavaScript is loaded only when
 * the launcher mounts it (`next/dynamic`, `ssr: false`), so a page that never opens the chat ships
 * none of it. The look lives in the parts: `chat-header`, `chat-thread`, `chat-composer`.
 */
import { usePathname } from 'next/navigation'
import { useEffect, useReducer, useRef, useState } from 'react'

import { ChatShell } from '../ui/chat-shell'
import { chatReducer, INITIAL_CHAT_STATE } from './chat-reducer'
import { ChatComposer } from './chat-composer'
import { talkToPersonLink } from './chat-contact'
import { ChatDisclosure } from './chat-disclosure'
import { ChatHeader } from './chat-header'
import { ChatThread } from './chat-thread'
import { sendChatMessage, startChatSession, type StreamHandle } from './chat-client'
import { useChatPageInfo } from './chat-page-context'
import { isEscapeKey } from './keys'
import type { ChatPanelText } from './lexicon/types'
import type { ChatContact, SiteKey, SiteLocale } from './types'
import { ChatTurnstile } from './turnstile-widget'
import { useStickToBottom } from './use-stick-to-bottom'

export type ChatPanelProps = {
  readonly site: SiteKey
  readonly locale: SiteLocale
  readonly origin: string
  readonly turnstileSiteKey: string | null
  readonly text: ChatPanelText
  readonly suggestions: readonly string[]
  /** The site's public WhatsApp and email links � the fixed "Talk to a person" action. */
  readonly contact: ChatContact
  readonly onClose: () => void
}

const DEFAULT_MAX_CHARS = 1000

export function ChatPanel({
  site,
  locale,
  origin,
  turnstileSiteKey,
  text,
  suggestions,
  contact,
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
  const logRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const streamRef = useRef<StreamHandle | null>(null)
  const askedToken = useRef(false)
  const { force: pinToBottom } = useStickToBottom(logRef, state)

  useEffect(() => {
    // A phone's keyboard would cover the greeting, so only a fine pointer lands in the composer;
    // otherwise focus goes to the first control (the panel's close button).
    const fine =
      typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches
    const field = composerRef.current
    const target =
      fine && field !== null && !field.disabled
        ? field
        : rootRef.current?.querySelector<HTMLElement>('button, input, textarea')
    target?.focus()
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

  function send(value: string, clearComposer = true): void {
    const trimmed = value.trim()
    if (trimmed === '' || state.streaming || session !== 'ready') return
    pinToBottom()
    dispatch({ type: 'send', text: trimmed })
    if (clearComposer) setComposer('')
    streamRef.current = sendChatMessage(
      { text: trimmed, locale, pagePath: pathname ?? '/' },
      (chatEvent) => dispatch({ type: 'event', event: chatEvent }),
      (seconds) => dispatch({ type: 'retryAfter', seconds }),
      () => dispatch({ type: 'networkError', message: text.networkError }),
    )
    // A tapped suggestion unmounts with the greeting; keep the visitor's place in the composer.
    composerRef.current?.focus({ preventScroll: true })
  }

  const notices: string[] = []
  if (state.errorMessage !== null) {
    notices.push(
      state.retryAfterSeconds !== null
        ? `${state.errorMessage} ${text.errorRetryIn.replace('{seconds}', String(state.retryAfterSeconds))}`
        : state.errorMessage,
    )
  }
  if (session === 'failed') notices.push(sessionError ?? text.networkError)

  return (
    <div ref={rootRef}>
      <ChatShell
        logRef={logRef}
        logLabel={text.threadLabel}
        header={
          <ChatHeader text={text} talk={talkToPersonLink(contact, origin)} onClose={onClose} />
        }
        disclosure={<ChatDisclosure text={text} privacyHref="/privacy" />}
        composer={
          <ChatComposer
            text={text}
            value={composer}
            maxChars={maxChars}
            streaming={state.streaming}
            canSend={session === 'ready' && composer.trim() !== ''}
            disabled={session === 'failed'}
            textareaRef={composerRef}
            onChange={setComposer}
            onSend={() => send(composer)}
            onStop={() => streamRef.current?.stop()}
          />
        }
      >
        <ChatThread
          text={text}
          site={site}
          locale={locale}
          origin={origin}
          state={state}
          contact={contact}
          pageTitle={pageInfo?.title ?? null}
          suggestions={suggestions}
          canPick={session === 'ready'}
          notices={notices}
          onPick={(suggestion) => send(suggestion, false)}
          onOpenLead={() => dispatch({ type: 'openLeadForm' })}
          onCancelLead={() => {
            dispatch({ type: 'closeLeadForm' })
            composerRef.current?.focus({ preventScroll: true })
          }}
          onLeadSubmitted={(reference) => dispatch({ type: 'leadSubmitted', reference })}
        />
      </ChatShell>
      {turnstileSiteKey !== null && session === 'starting' && (
        <ChatTurnstile siteKey={turnstileSiteKey} onToken={onToken} />
      )}
    </div>
  )
}
