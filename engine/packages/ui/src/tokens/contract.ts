/**
 * @contract C3 — the token contract · owner: ARC · consumers: UXG, UXE, BRD, ADM, WEB (primitives)
 *
 * The CSS custom properties every app defines, every one of them (DESIGN-SYSTEM.md §4).
 * Components use roles, never raw values; Tailwind v4 registers the roles with
 * `@theme inline`, so re-declaring a property re-skins everything beneath it. The contract is
 * a floor, not a ceiling: an app may add tokens of its own (the emporium's promo colour),
 * named `--app-…` so a later contract token never collides with one, while `@engine/ui`'s
 * primitives read contract tokens only. A brand may override only `BRAND_TOKEN_NAMES` (C1
 * owns that list, since config is the leaf — it is proven a subset here), injected at runtime
 * and validated at build and boot: one text pairing below AA rejects the whole override and
 * the app default renders. There is no dark mode on the storefronts; the viewer's full-screen
 * lightbox is the one dark rung (`--c-viewer`).
 */
import type { BrandTokenName } from '@engine/config/schema'

export const TOKENS = {
  colour: [
    '--c-ground',
    '--c-surface',
    '--c-surface-deep',
    '--c-ink',
    '--c-ink-soft',
    '--c-rule',
    '--c-accent',
    '--c-accent-ink',
    '--c-focus',
    '--c-positive',
    '--c-caution',
    '--c-critical',
    /** The zoom viewer's full-screen lightbox, the one dark rung, and the text on it. */
    '--c-viewer',
    '--c-viewer-ink',
    /** Behind a dialog, sheet or drawer: a translucent colour, never an opacity on content. */
    '--c-scrim',
  ],
  typeFamily: ['--font-display', '--font-text', '--font-ui', '--font-numeric'],
  /** Fluid (`clamp()`) where it matters. */
  typeStep: [
    '--t-hero',
    '--t-display',
    '--t-title',
    '--t-lede',
    '--t-body',
    '--t-small',
    '--t-micro',
  ],
  /** One reading measure; the space scale; the page gutter. */
  space: [
    '--measure',
    '--space-1',
    '--space-2',
    '--space-3',
    '--space-4',
    '--space-5',
    '--space-6',
    '--space-7',
    '--space-8',
    '--space-9',
    '--gutter',
  ],
  /** `--focus-width` is the focus ring's width: at least 2 px, always visible (WCAG 2.4.11). */
  shape: ['--radius-control', '--radius-card', '--rule-hair', '--rule-strong', '--focus-width'],
  /** In 280–360 ms, out 180–220 ms (DESIGN-SYSTEM.md §8); one easing family per app. */
  motion: ['--dur-in', '--dur-out', '--ease', '--reveal-distance'],
} as const
export type TokenGroup = keyof typeof TOKENS
export type TokenName = (typeof TOKENS)[TokenGroup][number]
export const TOKEN_NAMES: readonly TokenName[] = Object.values(TOKENS).flat()

/** An app's defaults: a value for every token — a missing one is a compile error. */
export type AppTokens = Readonly<Record<TokenName, string>>

/** The overridable subset is a subset of the contract, or this fails to compile. */
export type BrandToken = BrandTokenName & TokenName
const _brandTokensAreTokens: [BrandTokenName] extends [TokenName] ? true : false = true

/**
 * The pairings the contrast gate checks, on app defaults and on every brand override.
 * `text` needs 4.5:1 (WCAG 2.2 AA body text); `non-text` 3:1 (focus rings, status marks,
 * control borders — SC 1.4.11). `--c-ink-soft` is derived, never faded: ink mixed toward
 * `--c-surface-deep` as far as it can go while still clearing every `text` pairing — and
 * derived again whenever a brand overrides `--c-ink` or a ground, before the gate runs, never
 * kept from the app's default. Status is never colour alone (DESIGN-SYSTEM.md §9): a status
 * colour marks, its words are ink.
 */
export const CONTRAST_PAIRINGS = [
  { fg: '--c-ink', on: ['--c-ground', '--c-surface', '--c-surface-deep'], use: 'text' },
  { fg: '--c-ink-soft', on: ['--c-ground', '--c-surface', '--c-surface-deep'], use: 'text' },
  { fg: '--c-accent', on: ['--c-ground', '--c-surface'], use: 'text' },
  { fg: '--c-accent-ink', on: ['--c-accent'], use: 'text' },
  { fg: '--c-viewer-ink', on: ['--c-viewer'], use: 'text' },
  {
    fg: '--c-focus',
    on: ['--c-ground', '--c-surface', '--c-accent', '--c-viewer'],
    use: 'non-text',
  },
  { fg: '--c-rule', on: ['--c-ground', '--c-surface'], use: 'non-text' },
  { fg: '--c-positive', on: ['--c-ground', '--c-surface'], use: 'non-text' },
  { fg: '--c-caution', on: ['--c-ground', '--c-surface'], use: 'non-text' },
  { fg: '--c-critical', on: ['--c-ground', '--c-surface'], use: 'non-text' },
] as const satisfies readonly {
  fg: TokenName
  on: readonly TokenName[]
  use: 'text' | 'non-text'
}[]
export const MIN_CONTRAST = { text: 4.5, 'non-text': 3 } as const
