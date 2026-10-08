/**
 * The thread's layout atoms: an agent row (the small avatar, or an empty slot that keeps the column
 * aligned under it, then the content) and the agent's speech bubble. Everything the assistant puts
 * in the thread — greeting, replies, cards, handoffs, notices — sits in an agent row.
 */
import { ChatAvatar } from './chat-agent'
import styles from './chat-row.module.css'

export function AgentRow({
  agentName,
  avatar,
  children,
}: {
  readonly agentName: string
  /** First row of a run of the agent's messages: it carries the avatar and some space above. */
  readonly avatar: boolean
  readonly children: React.ReactNode
}): React.ReactElement {
  return (
    <div className={`${styles.agentRow} ${avatar ? styles.runStart : ''}`}>
      <span className={styles.slot}>{avatar && <ChatAvatar name={agentName} size="sm" />}</span>
      <div className={styles.body}>{children}</div>
    </div>
  )
}

export function AgentBubble({
  children,
  role = 'assistant',
}: {
  readonly children: React.ReactNode
  readonly role?: 'assistant' | 'greeting'
}): React.ReactElement {
  return (
    <p className={styles.agentBubble} data-chat-role={role}>
      {children}
    </p>
  )
}
