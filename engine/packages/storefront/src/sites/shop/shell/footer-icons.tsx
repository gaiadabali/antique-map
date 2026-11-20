/**
 * The footer's contact icons (the handoff of 2026-10-20, `oei.css` §footer): WhatsApp, Instagram
 * and Facebook drawn in the header icons' line — 24-unit box, 1.5 stroke, round caps — plus a plain
 * link for any other account the owner lists. Decorative: each link carries its own name.
 */
import type { ReactElement } from 'react'

const PATHS: Record<FooterIconName, readonly string[]> = {
  whatsapp: [
    'M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21',
    'M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1',
  ],
  instagram: [
    'M4 8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z',
    'M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0',
    'M16.5 7.5v.01',
  ],
  facebook: ['M7 10v4h3v7h4v-7h3l1-4h-4V8a1 1 0 0 1 1-1h3V3h-3a5 5 0 0 0-5 5v2H7'],
  link: [
    'M9 15l6-6',
    'M11 6l.46-.54a5 5 0 0 1 7.07 7.07L18 13',
    'M13 18l-.4.54a5.07 5.07 0 0 1-7.12 0a4.97 4.97 0 0 1 0-7.07L6 11',
  ],
}

export type FooterIconName = 'whatsapp' | 'instagram' | 'facebook' | 'link'

/** The icon for an account the owner typed: Instagram and Facebook by name, anything else a link. */
export function socialIcon(platform: string): FooterIconName {
  const name = platform.trim().toLowerCase()
  if (name.includes('instagram')) return 'instagram'
  if (name.includes('facebook')) return 'facebook'
  return 'link'
}

export function FooterIcon({ name }: { readonly name: FooterIconName }): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
