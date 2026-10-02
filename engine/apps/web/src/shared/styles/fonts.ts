import { Cormorant_Garamond, Karla } from 'next/font/google'

/**
 * Owner font decision (TASKS.md Fonts, 2026-10-02):
 * Cormorant Garamond for display and numerals, Karla for everything read or clicked.
 * Both are served from our own origin by next/font/google (self-hosted at runtime).
 *
 * The returned `variable` CSS classes set `--font-display-face` and `--font-body-face`.
 * Apply `fontVariables` to the <html> element so the semantic tokens resolve to the
 * loaded faces. The layout edit that applies the class is task 4.3, so this module only
 * exports the ready-made string.
 */

export const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display-face',
  display: 'swap',
})

export const body = Karla({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-body-face',
  display: 'swap',
})

export const fontVariables = `${display.variable} ${body.variable}`
