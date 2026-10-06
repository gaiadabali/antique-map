/**
 * Small, shared pieces for the leads inbox and its sidebar blocks (TASKS.md 9.1.a–b). Plain
 * elements styled with Payload's own CSS custom properties (`--theme-*`), as
 * `../orders/shared.jsx`. `.jsx`, not `.tsx`: the cms package does not type-check React — see
 * `../widgets/dashboard.jsx`'s header.
 */
import { L as copyL } from './copy'

export function L(key, language) {
  return copyL(key, language === 'id' ? 'id' : 'en')
}

export function str(value) {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

export function Notice({ tone, children }) {
  if (!children) return null
  const good = tone !== 'error'
  return (
    <div
      role={good ? 'status' : 'alert'}
      style={{
        padding: '10px 14px',
        borderRadius: 8,
        marginBottom: 16,
        background: good ? 'var(--theme-success-100)' : 'var(--theme-error-100)',
        color: good ? 'var(--theme-success-750)' : 'var(--theme-error-750)',
        fontSize: 14,
      }}
    >
      {children}
    </div>
  )
}

export function Card({ children, style }) {
  return (
    <div
      style={{
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
        background: 'var(--theme-input-bg)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function QuietLink({ href, children }) {
  return (
    <a href={href} style={{ color: 'var(--theme-elevation-600)', fontSize: 14 }}>
      {children}
    </a>
  )
}

export function SubmitButton({ children, variant = 'primary' }) {
  const palette =
    variant === 'danger'
      ? { background: 'var(--theme-base-0)', color: 'var(--theme-error-500)', border: '1px solid var(--theme-error-500)' }
      : { background: 'var(--theme-success-500)', color: 'var(--theme-base-0)', border: '1px solid transparent' }
  return (
    <button
      type="submit"
      style={{
        padding: '10px 16px',
        borderRadius: 8,
        fontSize: 15,
        fontWeight: 600,
        cursor: 'pointer',
        minHeight: 40,
        ...palette,
      }}
    >
      {children}
    </button>
  )
}
