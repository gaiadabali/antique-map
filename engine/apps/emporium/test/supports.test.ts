/**
 * TASKS.md 4.1.c: this app's own `supports` — not C1's stated list — checks every committed brand
 * config that names this storefront (what `check:brands` and `createBrand` take up next).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { MODULE_KEYS } from '@engine/config/schema'
import { validateBrandConfigs } from '@engine/config/validate'
import { describe, expect, it } from 'vitest'

import { supports } from '../src/supports'

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url))
const storefrontOf = (file: string): unknown =>
  (JSON.parse(readFileSync(file, 'utf8')) as { storefront?: unknown }).storefront

describe('the emporium app’s supports', () => {
  it('declares its own storefront and only engine modules', () => {
    expect(supports.storefront).toBe('emporium')
    expect(supports.modules.every((key) => MODULE_KEYS.includes(key))).toBe(true)
  })

  it('passes every committed config that names this storefront', () => {
    const report = validateBrandConfigs({ repoRoot, supports: { emporium: supports } })
    const mine = report.results.filter((result) => storefrontOf(result.file) === 'emporium')
    expect(mine.length).toBeGreaterThanOrEqual(2) // a real brand and the synthetic one
    for (const result of mine) expect(result.issues, result.file).toEqual([])
  })
})
