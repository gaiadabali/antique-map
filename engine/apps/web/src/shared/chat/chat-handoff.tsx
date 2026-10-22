/**
 * A handoff link — "Continue on WhatsApp" or "Send an email" — used by the stream's handoff events
 * and by the error notice's fallback. WhatsApp is the primary action, email the secondary. The href
 * is re-checked against the allowlist (AI.md §3.3) before it is ever rendered: a link that fails is
 * dropped. WhatsApp opens in a new tab so the conversation stays open behind it.
 */
import { Button } from '../ui/button'
import { isAllowedHandoffHref } from './chat-client'
import type { HandoffChannel } from './types'
import styles from './chat-handoff.module.css'

export function ChatHandoffLink({
  channel,
  href,
  label,
  origin,
}: {
  readonly channel: HandoffChannel
  readonly href: string
  readonly label: string
  readonly origin: string
}): React.ReactElement | null {
  if (!isAllowedHandoffHref(href, origin)) return null
  return (
    <Button
      href={href}
      variant={channel === 'whatsapp' ? 'primary' : 'secondary'}
      className={styles.handoff}
      data-chat-role="handoff"
      data-channel={channel}
      {...(href.startsWith('https:') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {label}
    </Button>
  )
}
