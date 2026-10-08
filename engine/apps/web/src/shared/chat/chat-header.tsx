/**
 * The panel's header: the agent's identity (avatar, the site's name, "AI assistant · replies
 * instantly" and a status dot), the persistent "Talk to a person" action and a close button. The
 * action is a plain link to the site's own WhatsApp or email (`chat-contact.ts`) — shown only when
 * the owner has set one. On a narrow phone it keeps its icon and name (the name goes visually
 * hidden, never removed), so the row never wraps.
 */
import { ChatAvatar } from './chat-agent'
import type { TalkLink } from './chat-contact'
import { CloseIcon, PersonIcon } from './chat-icons'
import type { ChatPanelText } from './lexicon/types'
import styles from './chat-header.module.css'

export function ChatHeader({
  text,
  talk,
  onClose,
}: {
  readonly text: ChatPanelText
  readonly talk: TalkLink | null
  readonly onClose: () => void
}): React.ReactElement {
  return (
    <div className={styles.header}>
      <ChatAvatar name={text.agentName} size="md" online />
      <div className={styles.identity}>
        <h2 className={styles.name}>{text.agentName}</h2>
        <p className={styles.status}>{text.agentStatus}</p>
      </div>
      {talk !== null && (
        <a
          className={styles.talk}
          href={talk.href}
          {...(talk.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          <PersonIcon className={styles.icon} />
          <span className={styles.talkLabel}>{text.talkToPerson}</span>
        </a>
      )}
      <button
        type="button"
        className={styles.close}
        aria-label={text.close}
        title={text.close}
        onClick={onClose}
      >
        <CloseIcon className={styles.icon} />
      </button>
    </div>
  )
}
