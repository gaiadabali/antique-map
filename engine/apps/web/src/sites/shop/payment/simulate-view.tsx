/**
 * The simulator page (TASKS.md 6.5.a; COMMERCE.md §6): four buttons that stand in for Midtrans
 * while developing and testing off a real account — a plain "Test payment" banner so nobody
 * mistakes it for the real pay step.
 */
import {
  SIMULATOR_ACTIONS,
  simulateAction,
  type SimulatorAction,
} from '../../../server/shop/payment'
import { paymentText } from './copy'
import styles from './order-view.module.css'

export type SimulateViewProps = {
  readonly number: number
  readonly token: string
  readonly locale: 'en' | 'id'
  readonly attempt: string
}

const LABELS: Record<SimulatorAction, string> = {
  settle: 'Settle',
  pending: 'Pending',
  deny: 'Deny',
  expire: 'Expire',
}

export function SimulateView({
  number,
  token,
  locale,
  attempt,
}: SimulateViewProps): React.ReactElement {
  const t = paymentText(locale)
  return (
    <section className={styles.page}>
      <p className={styles.banner} role="status">
        {t('order.testPayment')}
      </p>
      <div className={styles.actions}>
        {SIMULATOR_ACTIONS.map((action) => (
          <form action={simulateAction} key={action}>
            <input type="hidden" name="number" value={number} />
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="attempt" value={attempt} />
            <input type="hidden" name="action" value={action} />
            <button type="submit">{LABELS[action]}</button>
          </form>
        ))}
      </div>
    </section>
  )
}
