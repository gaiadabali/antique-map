/**
 * The panel's few glyphs, drawn inline in `currentColor` so they follow the surface's ink role and
 * need no image file. Decorative: every button that carries one names itself with an `aria-label`.
 */
type IconProps = { readonly className?: string }

const BASE = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const

export function CloseIcon({ className }: IconProps): React.ReactElement {
  return (
    <svg {...BASE} className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function SendIcon({ className }: IconProps): React.ReactElement {
  return (
    <svg {...BASE} className={className}>
      <path d="M12 19V6M6 12l6-6 6 6" />
    </svg>
  )
}

export function StopIcon({ className }: IconProps): React.ReactElement {
  return (
    <svg {...BASE} className={className}>
      <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
    </svg>
  )
}

export function PersonIcon({ className }: IconProps): React.ReactElement {
  return (
    <svg {...BASE} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
    </svg>
  )
}

export function ChevronIcon({ className }: IconProps): React.ReactElement {
  return (
    <svg {...BASE} className={className}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

export function CheckIcon({ className }: IconProps): React.ReactElement {
  return (
    <svg {...BASE} className={className}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}
