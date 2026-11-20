/**
 * Test support only — which CMS a real-database test runs against. The shared stacks
 * (`./pushed-database`, `./staff-stack`, `./media-stack` test supports and the template databases)
 * build their Payload from the CMS a package registers here: today's one CMS (`@engine/cms`) or
 * the shop's (`@engine/cms-shop`), each from its own `db/test-cms` module, which every test of that
 * package reaches through its own support paths. One CMS per test file (Vitest isolates files).
 */
import type { Config, SanitizedConfig } from 'payload'

type Env = Readonly<Record<string, string | undefined>>

export type TestCms = {
  /** The config's input for `env` (the CMS's `engineConfig` / `shopConfig`). */
  readonly config: (env: Env) => Config
  /** The config every process runs (`buildEngineConfig` / `buildShopConfig`). */
  readonly build: (config: Config) => Promise<SanitizedConfig>
  /** The CMS's migrations, as its `migrations/index.ts` lists them. */
  readonly migrations: readonly unknown[]
  /** What every test database's name starts with: the shop's are `indies_shop_…`. */
  readonly databasePrefix?: string
}

const KEY = Symbol.for('@engine/cms-core/test-cms')
const registry = globalThis as typeof globalThis & { [KEY]?: TestCms }

/** Registers the CMS this test process runs against. */
export function useTestCms(cms: TestCms): void {
  registry[KEY] = cms
}

/** The registered CMS; throws when a test reached a shared stack without its package's support. */
export function testCms(): TestCms {
  const cms = registry[KEY]
  if (!cms) {
    throw new Error(
      'no CMS registered for this test: import the stack through your package’s own test support (its db/test-cms module)',
    )
  }
  return cms
}
