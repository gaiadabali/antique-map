/**
 * The simulator page (TASKS.md 6.5.a; COMMERCE.md §6): four buttons that stand in for Midtrans
 * while developing and testing off a real account — a plain "Test payment" banner so nobody
 * mistakes it for the real pay step. Shown only when the token's order has an attempt still `open`
 * or `pending`; otherwise a link back to the order page (`6.5-r2`: no attempt id in the URL).
 */
import { Button, TextLink } from '../../../shared/ui'
import {
  SIMULATOR_ACTIONS,
  simulateAction,
  type SimulatorAction,
} from '../../../server/shop/payment'
import { paymentText } from './copy'
import styles from './order-view.module.css'

export type SimulateViewProps = {
  readonly token: string
  readonly locale: 'en' | 'id'
  /** The order's latest `open` or `pending` attempt, or `null` when there is none to settle. */
  readonly attempt: string | null
  readonly orderHref: string
}

const LABELS: Record<SimulatorAction, string> = {
  settle: 'Settle',
  pending: 'Pending',
  deny: 'Deny',
  expire: 'Expire',
}

export function SimulateView({
  token,
  locale,
  attempt,
  orderHref,
}: SimulateViewProps): React.ReactElement {
  const t = paymentText(locale)
  if (attempt === null) {
    return (
      <section className={styles.page}>
        <p className={styles.banner} role="status">
          {t('order.testPayment')}
        </p>
        <TextLink href={orderHref}>{t('order.checkAgain')}</TextLink>
      </section>
    )
  }
  return (
    <section className={styles.page}>
      <p className={styles.banner} role="status">
        {t('order.testPayment')}
      </p>
      <div className={styles.actions}>
        {SIMULATOR_ACTIONS.map((action) => (
          <form action={simulateAction} key={action}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="action" value={action} />
            <Button type="submit" variant="secondary">
              {LABELS[action]}
            </Button>
          </form>
        ))}
      </div>
    </section>
  )
}
