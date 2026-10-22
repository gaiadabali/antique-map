/**
 * Small, shared pieces for the leads inbox and its sidebar blocks (TASKS.md 9.1.a–b). Plain
 * elements with `ix-*` class names, styled from the admin's tokens in
 * `app/(payload)/admin/panels.css`, as `../orders/shared.jsx`. `.jsx`, not `.tsx`: the cms
 * package does not type-check React — see `../widgets/dashboard.jsx`'s header.
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
      className={`ix-notice ix-notice--${good ? 'ok' : 'error'}`}
    >
      {children}
    </div>
  )
}

export function Card({ children, className = '' }) {
  return <div className={`ix-card ${className}`.trim()}>{children}</div>
}

export function QuietLink({ href, children }) {
  return (
    <a href={href} className="ix-link">
      {children}
    </a>
  )
}

export function SubmitButton({ children, variant = 'primary' }) {
  const tone = variant === 'danger' ? 'ix-btn--danger' : 'ix-btn--primary'
  return (
    <button type="submit" className={`ix-btn ${tone}`}>
      {children}
    </button>
  )
}
