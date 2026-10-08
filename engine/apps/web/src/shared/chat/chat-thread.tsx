'use client'

/**
 * The conversation itself: the agent's greeting, the suggested starts (until the first message),
 * the transcript, the typing dots, the lead flow and any notice — everything inside the panel's
 * scrolling log. Pure presentation of the reducer's state; the panel owns sending.
 */
import { ChatEntries, type HandoffLabels } from './chat-entries'
import { ChatLead } from './chat-lead'
import { ChatNotice } from './chat-notice'
import type { ChatState } from './chat-reducer'
import { AgentBubble, AgentRow } from './chat-row'
import { ChatSuggestions } from './chat-suggestions'
import { awaitingReply, greetingText } from './chat-thread-logic'
import { ChatTyping } from './chat-typing'
import type { ChatPanelText } from './lexicon/types'
import type { ChatContact, SiteKey, SiteLocale } from './types'

export function ChatThread({
  text,
  site,
  locale,
  origin,
  state,
  contact,
  pageTitle,
  suggestions,
  canPick,
  notices,
  onPick,
  onOpenLead,
  onCancelLead,
  onLeadSubmitted,
}: {
  readonly text: ChatPanelText
  readonly site: SiteKey
  readonly locale: SiteLocale
  readonly origin: string
  readonly state: ChatState
  readonly contact: ChatContact
  /** The item or product page the chat was opened from, if any. */
  readonly pageTitle: string | null
  readonly suggestions: readonly string[]
  readonly canPick: boolean
  readonly notices: readonly string[]
  readonly onPick: (suggestion: string) => void
  readonly onOpenLead: () => void
  readonly onCancelLead: () => void
  readonly onLeadSubmitted: (reference: string) => void
}): React.ReactElement {
  const agentName = text.agentName
  const handoffLabels: HandoffLabels = {
    whatsapp: text.handoffWhatsapp,
    email: text.handoffEmail,
  }
  return (
    <>
      <AgentRow agentName={agentName} avatar>
        <AgentBubble role="greeting">{greetingText(text, site, pageTitle)}</AgentBubble>
      </AgentRow>
      {state.entries.length === 0 && (
        <ChatSuggestions
          label={text.suggestionsLabel}
          suggestions={suggestions}
          disabled={!canPick || state.streaming}
          onPick={onPick}
        />
      )}
      <ChatEntries
        entries={state.entries}
        origin={origin}
        handoffLabels={handoffLabels}
        agentName={agentName}
      />
      {awaitingReply(state) && (
        <AgentRow agentName={agentName} avatar>
          <ChatTyping label={text.typing} />
        </AgentRow>
      )}
      <ChatLead
        state={state}
        text={text}
        locale={locale}
        agentName={agentName}
        onOpen={onOpenLead}
        onCancel={onCancelLead}
        onSubmitted={onLeadSubmitted}
      />
      {notices.map((message) => (
        <ChatNotice
          key={message}
          message={message}
          help={text.noticeHelp}
          contact={contact}
          origin={origin}
          handoffLabels={handoffLabels}
          agentName={agentName}
        />
      ))}
    </>
  )
}
