/**
 * The shop's quiet link (the handoff's `caps-u`): 12 px capitals, tracked, underlined. A plain
 * <a>: storefront links never prefetch.
 */
import type { AnchorHTMLAttributes, ReactNode } from 'react'

import styles from './caps-link.module.css'

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  readonly href: string
  readonly children: ReactNode
}

export function CapsLink({ className, children, ...rest }: Props) {
  return (
    <a {...rest} className={[styles.link, className].filter(Boolean).join(' ')}>
      {children}
    </a>
  )
}

/** The same capitals without the underline: an eyebrow, a label, a list of signals. */
export function Caps({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={[styles.caps, className].filter(Boolean).join(' ')}>{children}</span>
}
