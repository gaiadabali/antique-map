/**
 * Small, shared pieces for the store panel and the owner/editor view (TASKS.md 7.2). Plain
 * elements with semantic `ix-*` class names, styled from the admin's tokens in
 * `app/(payload)/admin/panels.css` — never a raw colour or font here. `.jsx`, not `.tsx`: see
 * `../widgets/dashboard.jsx`'s header — the cms package does not type-check React.
 */
import { ORDERS_PANEL_COPY } from '../../i18n/orders-panel'

/** A copy key in the caller's admin language, falling back to English. */
export function L(key, language) {
  const entry = ORDERS_PANEL_COPY[key]
  if (!entry) return key
  return entry[language] ?? entry.en
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

const VARIANT_CLASS = {
  primary: 'ix-btn--primary',
  danger: 'ix-btn--danger',
  quiet: 'ix-btn--quiet',
}

function buttonClass(variant) {
  return `ix-btn ${VARIANT_CLASS[variant] ?? ''}`.trim()
}

/** A link styled as a button — every action here is a plain navigation or form, no client JS. */
export function BigButton({ href, children, variant = 'primary', disabled = false, title }) {
  if (disabled) {
    return (
      <span className={`${buttonClass(variant)} ix-btn--disabled`} title={title}>
        {children}
      </span>
    )
  }
  return (
    <a href={href} className={buttonClass(variant)} title={title}>
      {children}
    </a>
  )
}

/** The same look as `BigButton`, as a form's submit button. */
export function SubmitButton({ children, variant = 'primary' }) {
  return (
    <button type="submit" className={buttonClass(variant)}>
      {children}
    </button>
  )
}

export function QuietLink({ href, children }) {
  return (
    <a href={href} className="ix-link">
      {children}
    </a>
  )
}

export function Card({ children, className = '' }) {
  return <div className={`ix-card ${className}`.trim()}>{children}</div>
}

const TONES = {
  delivered: 'success',
  awaiting_quote: 'warning',
  pending_payment: 'warning',
  waiting_driver: 'warning',
  cancelled: 'danger',
  expired: 'danger',
}

/** A status as a small square tag, always in words: the tone is never the only signal. */
export function StatusTag({ status, children }) {
  return <span className={`ix-tag ix-tag--${TONES[status] ?? 'neutral'}`}>{children}</span>
}

export function rupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount ?? 0)
}

export function str(value) {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

/** A refusal code from the fulfilment core (`shop/fulfilment/types.ts`) in the admin's language. */
export function refusalCopy(code, language) {
  if (!code) return ''
  const key = `refusal_${code}`
  return ORDERS_PANEL_COPY[key] ? L(key, language) : L('refusal_unavailable', language)
}
