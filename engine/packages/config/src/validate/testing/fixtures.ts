/**
 * Test helpers for the loader, validation and boot-check tests — never imported by shipped
 * code. The committed brand configs are the fixtures: the synthetic brand's two files, read
 * from the repository, mutated per case.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { MODULE_KEYS, type AppSupports, type ModuleKey, type Storefront } from '../../schema'
import type { SupportsByApp } from '../committed'

/** The repository root, six levels above this folder. */
export const REPO_ROOT = fileURLToPath(new URL('../../../../../../', import.meta.url))

/**
 * Each app's supports as its `supports` file states them (TASKS.md 4.1.c, 6.5.d): the gallery
 * renders every module but `accounts.retailers`, the buying-online ones — `purchase.checkout`,
 * `purchase.offers` and `purchase.holds` (enquiry-only, D50) — and the account ones —
 * `accounts.buyers`, `retention.wishlist` and `retention.wantList` (no gallery sign-in, D54); the
 * emporium every module but `accounts.buyers`, `retention.wishlist` and `retention.wantList`.
 * The config package imports no app, so its tests read this copy; keep it in step with the files.
 */
const omit = (...keys: ModuleKey[]) => MODULE_KEYS.filter((key) => !keys.includes(key))
export const C1_STATED_SUPPORTS = {
  gallery: {
    storefront: 'gallery',
    modules: omit(
      'accounts.retailers',
      'purchase.checkout',
      'purchase.offers',
      'purchase.holds',
      'accounts.buyers',
      'retention.wishlist',
      'retention.wantList',
    ),
  },
  emporium: {
    storefront: 'emporium',
    modules: omit('accounts.buyers', 'retention.wishlist', 'retention.wantList'),
  },
} as const satisfies SupportsByApp & Record<Storefront, AppSupports>

/** The synthetic brand's committed config for a storefront, as raw JSON (a fresh copy). */
export function testBrandConfig(storefront: Storefront): Record<string, unknown> & {
  modules: Record<string, boolean>
} {
  const file = join(REPO_ROOT, 'test', 'site', `brand.${storefront}.json`)
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown> & {
    modules: Record<string, boolean>
  }
}

/** An environment for the synthetic brand, relative to the repository root. */
export function testEnv(storefront: Storefront, extra: Record<string, string> = {}) {
  return { BRAND: 'test', BRAND_ROOT: './test', TEST_STOREFRONT: storefront, ...extra }
}
