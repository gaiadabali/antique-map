import styles from './facet-chip.module.css'

export type FacetChipProps = {
  readonly label: string
  readonly count?: number
  readonly pressed: boolean
  readonly onToggle?: () => void
  readonly className?: string
}

/** A toggleable filter chip with an optional count. */
export function FacetChip({
  label,
  count,
  pressed,
  onToggle,
  className,
}: FacetChipProps): React.ReactElement {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={[styles.chip, className].filter(Boolean).join(' ')}
    >
      <span className={styles.label}>{label}</span>
      {count !== undefined && <span className={styles.count}>{count}</span>}
    </button>
  )
}
