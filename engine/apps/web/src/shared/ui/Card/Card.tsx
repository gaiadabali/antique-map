import type { ReactNode } from 'react'

import styles from './Card.module.css'

type Props = {
  children: ReactNode
  as?: 'article' | 'div'
  className?: string
  tone?: 'default' | 'deep' | 'dark'
}

export function Card({ children, as: Component = 'article', className, tone = 'default' }: Props) {
  return (
    <Component className={[styles.card, styles[tone], className ?? ''].filter(Boolean).join(' ')}>
      {children}
    </Component>
  )
}
