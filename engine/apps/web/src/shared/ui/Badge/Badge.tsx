import type { ReactNode } from 'react'

import styles from './Badge.module.css'

type Props = {
  children: ReactNode
  tone?: 'default' | 'success' | 'caution' | 'critical'
}

export function Badge({ children, tone = 'default' }: Props) {
  return <span className={[styles.badge, styles[tone]].filter(Boolean).join(' ')}>{children}</span>
}
