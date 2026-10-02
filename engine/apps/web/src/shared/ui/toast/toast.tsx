'use client'

import type { ReactNode } from 'react'

import styles from './toast.module.css'

type Props = {
  children: ReactNode
}

export function Toast({ children }: Props) {
  return (
    <div className={styles.toast} role="status" aria-live="polite" aria-atomic="true">
      {children}
    </div>
  )
}
