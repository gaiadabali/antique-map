'use client'

/**
 * One line's quantity stepper and remove button (6.2; the handoff's Bag: − n + in one ruled box,
 * Remove as underlined capitals beside it). Plain forms posting to the bag's server actions, so the
 * edit works without JavaScript: each step is a submit button carrying the line's next quantity
 * (one fewer at 1 is 0, which removes the line). The labels and the one error line arrive as
 * server-rendered strings; the actions return outcomes, never prices.
 */
import { useActionState } from 'react'

import type { BagActionState } from '../../../server/shop/bag/actions'
import { removeBagLineAction, setBagLineQtyAction } from '../../../server/shop/bag/actions'
import styles from './bag.module.css'

export type QtyFormProps = {
  readonly productId: number
  readonly variantSku: string | null
  readonly qty: number
  readonly max: number
  /** The stepper's group name ("Quantity"). */
  readonly label: string
  readonly fewerLabel: string
  readonly moreLabel: string
  /** The visible word ("Remove"); the button's name says which line (`removeName`). */
  readonly removeLabel: string
  readonly removeName: string
  readonly rangeMessage: string
  readonly cappedMessage: string
}

const INITIAL: BagActionState | null = null

export function QtyForm({
  productId,
  variantSku,
  qty,
  max,
  label,
  fewerLabel,
  moreLabel,
  removeLabel,
  removeName,
  rangeMessage,
  cappedMessage,
}: QtyFormProps): React.ReactElement {
  const [state, update, pending] = useActionState(setBagLineQtyAction, INITIAL)
  const [removed, remove, removing] = useActionState(removeBagLineAction, INITIAL)
  const problem =
    state?.outcome === 'invalid'
      ? rangeMessage
      : state?.outcome === 'capped'
        ? cappedMessage.replace('{max}', String(state.maxQty ?? max))
        : null
  return (
    <div className={styles.qty}>
      <form action={update} className={styles.stepper} role="group" aria-label={label}>
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="variantSku" value={variantSku ?? ''} />
        <button
          type="submit"
          name="qty"
          value={qty - 1}
          className={styles.step}
          aria-label={fewerLabel}
          disabled={pending}
        >
          −
        </button>
        <span className={styles.count} aria-live="polite">
          {qty}
        </span>
        <button
          type="submit"
          name="qty"
          value={qty + 1}
          className={styles.step}
          aria-label={moreLabel}
          disabled={pending || qty >= max}
        >
          +
        </button>
      </form>
      <form action={remove}>
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="variantSku" value={variantSku ?? ''} />
        <input type="hidden" name="qty" value="0" />
        <button type="submit" className={styles.remove} aria-label={removeName} disabled={removing}>
          {removeLabel}
        </button>
      </form>
      {problem !== null && (
        <p className={styles.problem} role="status">
          {problem}
        </p>
      )}
      {removed?.outcome === 'invalid' && (
        <p className={styles.problem} role="status">
          {rangeMessage}
        </p>
      )}
    </div>
  )
}
