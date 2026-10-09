'use client'

/**
 * *Pay* and *Try again* (6.5.a): a plain form that works without JavaScript (`payAction` redirects
 * to the simulator in simulate mode, or answers a Snap token); with it, a settled or closed pop-up
 * refreshes the page so the server shows what actually happened — never what the pop-up claimed.
 */
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '../../../shared/ui'
import { payAction, type PayState } from '../../../server/shop/payment/actions'
import { SnapPay } from './snap-pay'
import styles from './order-view.module.css'

export type PayFormProps = {
  readonly token: string
  readonly locale: 'en' | 'id'
  readonly label: string
  readonly scriptSrc: string
  readonly redirectUrlFallback: string
}

const INITIAL: PayState = null

export function PayForm({
  token,
  locale,
  label,
  scriptSrc,
  redirectUrlFallback,
}: PayFormProps): React.ReactElement {
  const [state, dispatch, pending] = useActionState(payAction, INITIAL)
  const router = useRouter()

  return (
    <div className={styles.actions}>
      <form action={dispatch}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="locale" value={locale} />
        <Button type="submit" loading={pending}>
          {label}
        </Button>
      </form>
      {state !== null && state.ok && (
        <SnapPay
          token={state.token}
          clientKey={state.clientKey}
          scriptSrc={scriptSrc}
          redirectUrl={redirectUrlFallback}
          onSettled={() => router.refresh()}
          onClosed={() => router.refresh()}
        />
      )}
    </div>
  )
}
