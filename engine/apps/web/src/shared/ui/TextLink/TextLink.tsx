import type { AnchorHTMLAttributes, ReactNode } from 'react'

import styles from './TextLink.module.css'

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode
}

export function TextLink({ children, ...rest }: Props) {
  return (
    <a {...rest} className={[styles.link, rest.className ?? ''].filter(Boolean).join(' ')}>
      {children}
    </a>
  )
}
