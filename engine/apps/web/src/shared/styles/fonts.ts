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
  style: ['normal'],
  variable: '--font-display-face',
  display: 'swap',
})

/**
 * The italic face is a second declaration of the same family (`@font-face` names
 * 'Cormorant Garamond', style italic), so `font-style: italic` finds it. It is not preloaded:
 * only the item page's original title uses it, and a preloaded face no page uses is 39 KB
 * every other page downloads before it can paint (the 10.2 LCP finding).
 */
export const displayItalic = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['italic'],
  variable: '--font-display-italic-face',
  display: 'swap',
  preload: false,
})

export const body = Karla({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-body-face',
  display: 'swap',
})

export const fontVariables = `${display.variable} ${displayItalic.variable} ${body.variable}`
