'use client'

/**
 * Renders the panel's transcript (AI.md §2.2): the model's text, a quiet status line, a linked
 * card, and a handoff button. A handoff's `href` is re-checked against the allowlist (§3.3) before
 * it is ever rendered as a link — a href that fails is dropped rather than shown broken or unsafe. A
 * remote card image loads in CORS mode, as `ResponsiveImage` does: the media origin sends no `Vary:
 * Origin`, so one plain load would poison the cache for the item page's CORS loads.
 */
import { isAllowedCardHref, isAllowedHandoffHref } from './chat-client'
import type { ChatEntry } from './chat-reducer'

export function ChatEntries({
  entries,
  origin,
  handoffLabels,
}: {
  readonly entries: readonly ChatEntry[]
  readonly origin: string
  readonly handoffLabels: Readonly<Record<'whatsapp' | 'email', string>>
}): React.ReactElement {
  return (
    <>
      {entries.map((entry, index) => (
        <ChatEntryView key={index} entry={entry} origin={origin} handoffLabels={handoffLabels} />
      ))}
    </>
  )
}

function ChatEntryView({
  entry,
  origin,
  handoffLabels,
}: {
  readonly entry: ChatEntry
  readonly origin: string
  readonly handoffLabels: Readonly<Record<'whatsapp' | 'email', string>>
}): React.ReactElement | null {
  switch (entry.kind) {
    case 'user':
      return <p data-chat-role="user">{entry.text}</p>
    case 'assistant':
      return <p data-chat-role="assistant">{entry.text}</p>
    case 'status':
      return (
        <p data-chat-role="status" aria-hidden="true">
          {entry.label}
        </p>
      )
    case 'card':
      return isAllowedCardHref(entry.card.url, origin) ? (
        <a data-chat-role="card" href={entry.card.url}>
          {entry.card.image !== null && (
            <img
              src={entry.card.image}
              alt=""
              crossOrigin={/^https?:\/\//.test(entry.card.image) ? 'anonymous' : undefined}
            />
          )}
          <span>{entry.card.title}</span>
          {entry.card.statusLabel !== undefined && <span>{entry.card.statusLabel}</span>}
          {entry.card.priceLabel !== undefined && <span>{entry.card.priceLabel}</span>}
        </a>
      ) : null
    case 'handoff':
      return isAllowedHandoffHref(entry.href, origin) ? (
        <a data-chat-role="handoff" data-channel={entry.channel} href={entry.href}>
          {entry.label || handoffLabels[entry.channel]}
        </a>
      ) : null
    default:
      return null
  }
}
