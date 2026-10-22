import { formatRupiah } from './format-rupiah'
import styles from './price.module.css'

export type PriceProps = {
  readonly amount: number
  readonly className?: string
}

/** A rupiah price rendered in the price typographic role. */
export function Price({ amount, className }: PriceProps): React.ReactElement {
  return (
    <span className={[styles.price, className].filter(Boolean).join(' ')}>
      {formatRupiah(amount)}
    </span>
  )
}
