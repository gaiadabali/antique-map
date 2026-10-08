'use client'

/**
 * Renders the panel's transcript (AI.md §2.2) as a conversation: the visitor's words in accent
 * bubbles on the right, the model's text in raised bubbles on the left with the agent's avatar, a
 * quiet status line, a linked card, and a handoff button. A handoff's `href` is re-checked against
 * the allowlist (§3.3) before it is ever rendered as a link — a href that fails is dropped rather
 * than shown broken or unsafe. A remote card image loads in CORS mode, as `ResponsiveImage` does:
 * the media origin sends no `Vary: Origin`, so one plain load would poison the cache for the item
 * page's CORS loads.
 */
import { ChatHandoffLink } from './chat-handoff'
import { isAllowedCardHref, isAllowedHandoffHref } from './chat-client'
import { ChevronIcon } from './chat-icons'
import type { ChatEntry } from './chat-reducer'
import { AgentBubble, AgentRow } from './chat-row'
import styles from './chat-entries.module.css'

export type HandoffLabels = Readonly<Record<'whatsapp' | 'email', string>>

export function ChatEntries({
  entries,
  origin,
  handoffLabels,
  agentName,
}: {
  readonly entries: readonly ChatEntry[]
  readonly origin: string
  readonly handoffLabels: HandoffLabels
  readonly agentName: string
}): React.ReactElement {
  return (
    <>
      {entries.map((entry, index) => (
        <ChatEntryView
          key={index}
          entry={entry}
          origin={origin}
          handoffLabels={handoffLabels}
          agentName={agentName}
          // A run of the agent's messages carries its avatar once, on the first.
          startsRun={index === 0 || entries[index - 1]?.kind === 'user'}
        />
      ))}
    </>
  )
}

function ChatEntryView({
  entry,
  origin,
  handoffLabels,
  agentName,
  startsRun,
}: {
  readonly entry: ChatEntry
  readonly origin: string
  readonly handoffLabels: HandoffLabels
  readonly agentName: string
  readonly startsRun: boolean
}): React.ReactElement | null {
  switch (entry.kind) {
    case 'user':
      return (
        <p className={styles.visitor} data-chat-role="user">
          {entry.text}
        </p>
      )
    case 'assistant':
      return (
        <AgentRow agentName={agentName} avatar={startsRun}>
          <AgentBubble>{entry.text}</AgentBubble>
        </AgentRow>
      )
    case 'status':
      return (
        <AgentRow agentName={agentName} avatar={false}>
          <p className={styles.status} data-chat-role="status" aria-hidden="true">
            {entry.label}
          </p>
        </AgentRow>
      )
    case 'card':
      return isAllowedCardHref(entry.card.url, origin) ? (
        <AgentRow agentName={agentName} avatar={startsRun}>
          <a className={styles.card} data-chat-role="card" href={entry.card.url}>
            {entry.card.image !== null && (
              <img
                className={styles.image}
                src={entry.card.image}
                alt=""
                crossOrigin={/^https?:\/\//.test(entry.card.image) ? 'anonymous' : undefined}
              />
            )}
            <span className={styles.cardText}>
              <span className={styles.cardTitle}>{entry.card.title}</span>
              {entry.card.statusLabel !== undefined && (
                <span className={styles.cardMeta}>{entry.card.statusLabel}</span>
              )}
              {entry.card.priceLabel !== undefined && (
                <span className={styles.cardPrice}>{entry.card.priceLabel}</span>
              )}
            </span>
            <ChevronIcon className={styles.chevron} />
          </a>
        </AgentRow>
      ) : null
    case 'handoff':
      return isAllowedHandoffHref(entry.href, origin) ? (
        <AgentRow agentName={agentName} avatar={startsRun}>
          <ChatHandoffLink
            channel={entry.channel}
            href={entry.href}
            label={entry.label || handoffLabels[entry.channel]}
            origin={origin}
          />
        </AgentRow>
      ) : null
    default:
      return null
  }
}
