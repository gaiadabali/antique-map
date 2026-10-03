'use client'

/**
 * One line's quantity stepper and remove button (6.2; EXPERIENCE-SHOP.md §5): plain forms posting
 * to the bag's server actions, so the edit works without JavaScript. The labels and the one error
 * line arrive as server-rendered strings; the actions return outcomes, never prices.
 */
import { useActionState } from 'react'

import type { BagActionState } from '../../../server/shop/bag/actions'
import { removeBagLineAction, setBagLineQtyAction } from '../../../server/shop/bag/actions'
import styles from './bag.module.css'

export type QtyFormProps = {
  readonly productId: number
  readonly variantSku: string | null
  readonly qty: number
  readonly min: number
  readonly max: number
  readonly label: string
  readonly updateLabel: string
  readonly removeLabel: string
  readonly rangeMessage: string
  readonly cappedMessage: string
}

const INITIAL: BagActionState | null = null

export function QtyForm({
  productId,
  variantSku,
  qty,
  min,
  max,
  label,
  updateLabel,
  removeLabel,
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
      <form action={update} className={styles.qtyForm}>
        <label className={styles.qtyLabel} htmlFor={`qty-${productId}-${variantSku ?? 'single'}`}>
          {label}
        </label>
        <input
          id={`qty-${productId}-${variantSku ?? 'single'}`}
          name="qty"
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          defaultValue={qty}
          className={styles.qtyInput}
          required
        />
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="variantSku" value={variantSku ?? ''} />
        <button type="submit" className={styles.qtyUpdate} disabled={pending}>
          {updateLabel}
        </button>
      </form>
      <form action={remove}>
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="variantSku" value={variantSku ?? ''} />
        <input type="hidden" name="qty" value="0" />
        <button type="submit" className={styles.remove} disabled={removing}>
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
