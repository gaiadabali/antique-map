/**
 * The shop CMS's real-database tests (`pnpm --filter @engine/cms-shop test:db`, TASKS.md 23.1.d):
 * every `*.db.test.ts` of this package, on Postgres at `CMS_TEST_POSTGRES_URL`, each file in a
 * database of its own named `indies_shop_…`, cloned from the shop's own template databases (one
 * migrated by its migrations, one pushed from its config — `./src/db/test-templates`). Its unit
 * tests run with every package's in the root config's `packages` project.
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'db-shop',
    include: ['src/**/*.db.test.{ts,tsx}'],
    exclude: ['**/node_modules/**'],
    globalSetup: ['src/db/test-templates.global-setup.test-support.ts'],
  },
})
