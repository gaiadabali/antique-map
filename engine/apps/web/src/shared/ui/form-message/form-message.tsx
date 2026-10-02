import type { ReactNode } from 'react'

import styles from './form-message.module.css'

type Props = {
  children: ReactNode
  tone: 'info' | 'success' | 'error'
}

export function FormMessage({ children, tone }: Props) {
  return (
    <div
      className={[styles.message, styles[tone]].filter(Boolean).join(' ')}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  )
}
