import localFont from 'next/font/local'

/**
 * Owner font decision (TASKS.md Fonts, 2026-10-02):
 * Cormorant Garamond for display and numerals, Karla for everything read or clicked.
 *
 * The font files live in this repository (`./fonts/`, Latin subset, woff2, SIL Open Font
 * License 1.1 — the licences sit beside them) and are served from our own origin by
 * next/font/local. They used to come from next/font/google, which downloads them from Google at
 * build time; a failed download broke staging builds (`module-not-found` on the font's
 * module.css). A build must never depend on Google, so the files are committed.
 *
 * All three files are Google's variable fonts, each used once for the weight range we use.
 * Cormorant Garamond: 400-600 (normal, italic). Karla: 400-700 (normal).
 * `unicode-range` is Google's Latin range, kept so the browser behaves as it did before. Every
 * option is written out in each call: the font loader accepts only literal values.
 *
 * The returned `variable` CSS classes set `--font-display-face` and `--font-body-face`.
 * Apply `fontVariables` to the <html> element so the semantic tokens resolve to the
 * loaded faces. The layout edit that applies the class is task 4.3, so this module only
 * exports the ready-made string.
 */

export const display = localFont({
  src: [
    {
      path: './fonts/cormorant-garamond-latin-variable-normal.woff2',
      weight: '400 600',
      style: 'normal',
    },
  ],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
  variable: '--font-display-face',
  display: 'swap',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
  adjustFontFallback: 'Times New Roman',
})

/**
 * The italic face is its own loader call, so next/font gives it its own family name; a style reaches
 * it through `--font-display-italic-face`, not through `font-style: italic`. It is not preloaded:
 * only the item page's original title uses it, and a preloaded face no page uses is 39 KB
 * every other page downloads before it can paint (the 10.2 LCP finding).
 */
export const displayItalic = localFont({
  src: [
    {
      path: './fonts/cormorant-garamond-latin-variable-italic.woff2',
      weight: '400 600',
      style: 'italic',
    },
  ],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
  variable: '--font-display-italic-face',
  display: 'swap',
  preload: false,
  fallback: ['Georgia', 'Times New Roman', 'serif'],
  adjustFontFallback: 'Times New Roman',
})

export const body = localFont({
  src: [
    {
      path: './fonts/karla-latin-variable-normal.woff2',
      weight: '400 700',
      style: 'normal',
    },
  ],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
  variable: '--font-body-face',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
  adjustFontFallback: 'Arial',
})

export const fontVariables = `${display.variable} ${displayItalic.variable} ${body.variable}`
