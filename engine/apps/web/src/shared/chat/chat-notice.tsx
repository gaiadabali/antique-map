/**
 * A soft inline notice in the thread — rate limited, assistant off, or a network error — in the
 * interface's voice, never raw text. When the site has a public contact, it offers the handoff
 * links underneath, WhatsApp first, so the visitor is never left at a dead end.
 */
import { ChatHandoffLink } from './chat-handoff'
import type { HandoffLabels } from './chat-entries'
import { AgentRow } from './chat-row'
import type { ChatContact } from './types'
import styles from './chat-notice.module.css'

export function ChatNotice({
  message,
  help,
  contact,
  origin,
  handoffLabels,
  agentName,
}: {
  readonly message: string
  readonly help: string
  readonly contact: ChatContact
  readonly origin: string
  readonly handoffLabels: HandoffLabels
  readonly agentName: string
}): React.ReactElement {
  const hasContact = contact.whatsappHref !== null || contact.emailHref !== null
  return (
    <AgentRow agentName={agentName} avatar={false}>
      <div className={styles.notice} role="alert">
        <p className={styles.message}>{message}</p>
        {hasContact && (
          <>
            <p className={styles.help}>{help}</p>
            <div className={styles.actions}>
              {contact.whatsappHref !== null && (
                <ChatHandoffLink
                  channel="whatsapp"
                  href={contact.whatsappHref}
                  label={handoffLabels.whatsapp}
                  origin={origin}
                />
              )}
              {contact.emailHref !== null && (
                <ChatHandoffLink
                  channel="email"
                  href={contact.emailHref}
                  label={handoffLabels.email}
                  origin={origin}
                />
              )}
            </div>
          </>
        )}
      </div>
    </AgentRow>
  )
}
