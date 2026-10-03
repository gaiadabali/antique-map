import type { ReactNode } from 'react'

import styles from './eyebrow.module.css'

type Props = {
  children: ReactNode
}

export function Eyebrow({ children }: Props) {
  return <span className={styles.eyebrow}>{children}</span>
}
