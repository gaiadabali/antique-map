/**
 * The brand this process serves, for the few things `BRAND` may shape in the CMS (ARCHITECTURE.md
 * §2): the server URL, CSRF/CORS, the email sender, and — read at request time — module
 * visibility and access. `null` when `BRAND` is unset: the build, `generate:types`,
 * `migrate:create`, and every other context whose output must not depend on a brand.
 *
 * `loadBrandConfig()` reads one file and memoises it per process; it never touches a database.
 * A brand that is set but invalid throws here, naming each field — the same refusal `bootCheck()`
 * gives (TASKS.md 3.1.a), so a process never runs on half a config.
 */
import { loadBrandConfig } from '@engine/config/loader'
import type { BrandConfig } from '@engine/config/schema'

type Env = Readonly<Record<string, string | undefined>>

export function brandFrom(env: Env): BrandConfig | null {
  if (!env.BRAND?.trim()) return null
  return loadBrandConfig({ env })
}

export function activeBrand(): BrandConfig | null {
  return brandFrom(process.env)
}
