/**
 * The chat door's glyphs, apart from the panel's (`./chat-icons`), so the launcher on every page
 * carries only these two and the panel's icons load with the panel. Drawn inline in
 * `currentColor`; decorative — the button names itself.
 */
export type IconProps = { readonly className?: string }

export const ICON_BASE = {
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

/** The chat door: a square-cornered speech bubble with its tail at the lower left. */
export function ChatIcon({ className }: IconProps): React.ReactElement {
  return (
    <svg {...ICON_BASE} className={className}>
      <path d="M4 5h16v11H11l-4.5 3.5V16H4z" />
    </svg>
  )
}

/** The round chat door (the shop): a circular speech bubble, tail at the lower left, a heavier line. */
export function RoundChatIcon({ className }: IconProps): React.ReactElement {
  return (
    <svg {...ICON_BASE} strokeWidth={2.5} className={className}>
      <path d="M12 3a8.5 8.5 0 1 1-4.2 15.9L3.5 20.5l1.6-4.3A8.5 8.5 0 0 1 12 3z" />
    </svg>
  )
}
