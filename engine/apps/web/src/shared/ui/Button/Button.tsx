import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'

import styles from './Button.module.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet'
  size?: 'default' | 'small'
  loading?: boolean
  children: ReactNode
}

type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
  variant?: 'primary' | 'secondary' | 'quiet'
  size?: 'default' | 'small'
  loading?: boolean
  children: ReactNode
}

export type Props = ButtonProps | AnchorProps

export function Button(props: Props) {
  const { variant = 'primary', size = 'default', loading = false, children, ...rest } = props
  const className = [
    styles.button,
    styles[variant],
    size === 'small' ? styles.small : styles.default,
    (rest as ButtonHTMLAttributes<HTMLButtonElement>).disabled || loading ? styles.disabled : '',
    rest.className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  if ('href' in props) {
    return (
      <a {...(rest as AnchorProps)} className={className} aria-disabled={loading || undefined}>
        {children}
      </a>
    )
  }

  return (
    <button
      {...(rest as ButtonProps)}
      className={className}
      disabled={(rest as ButtonProps).disabled || loading}
      aria-busy={loading || undefined}
    >
      {children}
    </button>
  )
}
