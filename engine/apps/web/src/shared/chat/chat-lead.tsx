'use client'

/**
 * The lead flow's three states as cards in the thread (AI.md §4): the "Leave my details" prompt the
 * `lead_form` event leaves behind — never an automatic form — the consent form once the visitor
 * opens it, and the confirmation with the reference once it is sent.
 */
import { Button } from '../ui/button'
import { CheckIcon } from './chat-icons'
import type { ChatState } from './chat-reducer'
import { AgentRow } from './chat-row'
import { ConsentForm } from './consent-form'
import type { ChatPanelText } from './lexicon/types'
import type { SiteLocale } from './types'
import styles from './chat-lead.module.css'

export function ChatLead({
  state,
  text,
  locale,
  agentName,
  onOpen,
  onCancel,
  onSubmitted,
}: {
  readonly state: Pick<ChatState, 'leadForm' | 'leadFormOpen' | 'leadReference'>
  readonly text: ChatPanelText
  readonly locale: SiteLocale
  readonly agentName: string
  readonly onOpen: () => void
  readonly onCancel: () => void
  readonly onSubmitted: (reference: string) => void
}): React.ReactElement | null {
  const { leadForm, leadFormOpen, leadReference } = state
  if (leadForm !== null && !leadFormOpen) {
    return (
      <AgentRow agentName={agentName} avatar={false}>
        <Button type="button" variant="secondary" className={styles.cta} onClick={onOpen}>
          {text.leadCta}
        </Button>
      </AgentRow>
    )
  }
  if (leadForm !== null) {
    return (
      <AgentRow agentName={agentName} avatar={false}>
        <ConsentForm
          form={leadForm}
          text={text}
          locale={locale}
          onSubmitted={onSubmitted}
          onCancel={onCancel}
        />
      </AgentRow>
    )
  }
  if (leadReference !== null) {
    return (
      <AgentRow agentName={agentName} avatar={false}>
        <p className={styles.success}>
          <CheckIcon className={styles.check} />
          <span>{text.leadSuccess.replace('{reference}', leadReference)}</span>
        </p>
      </AgentRow>
    )
  }
  return null
}
