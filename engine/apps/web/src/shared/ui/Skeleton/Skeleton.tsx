import styles from './Skeleton.module.css'

type Props = {
  width?: string
  height?: string
  circle?: boolean
  className?: string
}

export function Skeleton({ width, height, circle = false, className }: Props) {
  return (
    <span
      className={[styles.skeleton, circle ? styles.circle : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}
