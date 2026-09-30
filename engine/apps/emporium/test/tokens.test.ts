/**
 * The placeholder tokens (`src/styles/tokens.css`) define every C3 token, and every pairing C3's
 * contrast gate checks clears WCAG 2.2 AA — text 4.5:1, non-text 3:1 — before any design exists.
 */
import { readFileSync } from 'node:fs'

import { CONTRAST_PAIRINGS, MIN_CONTRAST, TOKEN_NAMES } from '@engine/ui/tokens/contract'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8')
const values = new Map(
  [...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]?.trim()]),
)

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
  const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear(r ?? 0) + 0.7152 * linear(g ?? 0) + 0.0722 * linear(b ?? 0)
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05)
}

describe('placeholder tokens', () => {
  it('define every C3 token', () => {
    expect(TOKEN_NAMES.filter((name) => !values.has(name))).toEqual([])
  })

  it.each(
    CONTRAST_PAIRINGS.flatMap((pair) => pair.on.map((on) => [pair.fg, on, pair.use] as const)),
  )('%s on %s clears AA (%s)', (fg, on, use) => {
    const [a, b] = [values.get(fg), values.get(on)]
    expect(a).toMatch(/^#[0-9a-f]{6}$/i)
    expect(b).toMatch(/^#[0-9a-f]{6}$/i)
    expect(contrast(a ?? '', b ?? '')).toBeGreaterThanOrEqual(MIN_CONTRAST[use])
  })
})
