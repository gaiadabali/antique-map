/**
 * Small, shared pieces for the store panel and the owner/editor view (TASKS.md 7.2). Plain
 * elements styled with Payload's own CSS custom properties (`--theme-*`), never a raw colour or
 * font — the admin is excluded from the sites' design system (DESIGN-SYSTEM.md §5) but still
 * borrows Payload's own tokens rather than inventing new ones. `.jsx`, not `.tsx`: see
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

const buttonBase = {
  display: 'inline-block',
  padding: '12px 20px',
  borderRadius: 8,
  fontSize: 16,
  fontWeight: 600,
  textDecoration: 'none',
  textAlign: 'center',
  minHeight: 44,
  lineHeight: '20px',
  cursor: 'pointer',
  border: '1px solid transparent',
}

const VARIANTS = {
  primary: { background: 'var(--theme-success-500)', color: 'var(--theme-base-0)' },
  danger: {
    background: 'var(--theme-base-0)',
    color: 'var(--theme-error-500)',
    borderColor: 'var(--theme-error-500)',
  },
  quiet: {
    background: 'var(--theme-base-0)',
    color: 'var(--theme-elevation-800)',
    borderColor: 'var(--theme-elevation-250)',
  },
}

function buttonStyle(variant) {
  return { ...buttonBase, ...VARIANTS[variant] }
}

/** A link styled as a button — every action here is a plain navigation or form, no client JS. */
export function BigButton({ href, children, variant = 'primary', disabled = false, title }) {
  const style = buttonStyle(variant)
  if (disabled) {
    return (
      <span style={{ ...style, opacity: 0.5, cursor: 'not-allowed' }} title={title}>
        {children}
      </span>
    )
  }
  return (
    <a href={href} style={style} title={title}>
      {children}
    </a>
  )
}

/** The same look as `BigButton`, as a form's submit button. */
export function SubmitButton({ children, variant = 'primary' }) {
  return (
    <button type="submit" style={buttonStyle(variant)}>
      {children}
    </button>
  )
}

export function QuietLink({ href, children }) {
  return (
    <a href={href} style={{ color: 'var(--theme-elevation-600)', fontSize: 14 }}>
      {children}
    </a>
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
