'use client'

/**
 * "Find my order" (TASKS.md 7.3.a; EXPERIENCE-SHOP.md §2): an order number and the email or
 * WhatsApp number typed at checkout, posted to `requestTrackingLinkAction`. The answer is the same
 * words whatever happened server side — never whether an order exists.
 */
import { useActionState } from 'react'

import { Button, FormMessage, Input } from '../../../shared/ui'
import { requestTrackingLinkAction, type FindOrderState } from './actions'
import { trackingText } from './copy'
import styles from './tracking.module.css'

export type FindOrderProps = {
  readonly locale: 'en' | 'id'
}

export function FindOrder({ locale }: FindOrderProps): React.ReactElement {
  const text = trackingText(locale)
  const [state, submit, pending] = useActionState<FindOrderState | null, FormData>(
    requestTrackingLinkAction,
    null,
  )

  return (
    <section className={styles.tracking} aria-labelledby="find-order-title">
      <h1 id="find-order-title" className={styles.title}>
        {text('tracking.find.title')}
      </h1>
      <form action={submit} className={styles.section} aria-label={text('tracking.find.title')}>
        <input type="hidden" name="locale" value={locale} />
        <Input
          id="find-order-number"
          name="orderNumber"
          label={text('tracking.find.orderNumber')}
          inputMode="numeric"
          autoComplete="off"
          required
        />
        <Input
          id="find-order-contact"
          name="contact"
          label={text('tracking.find.contact')}
          hint={text('tracking.find.contactHint')}
          autoComplete="off"
          required
        />
        <Button type="submit" loading={pending}>
          {pending ? text('tracking.find.sending') : text('tracking.find.submit')}
        </Button>
      </form>
      {state !== null && (
        <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage>
      )}
    </section>
  )
}
