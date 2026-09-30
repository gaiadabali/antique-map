/**
 * Runs this package's tests alone (`pnpm --filter @engine/migrate test`); the
 * root config's `packages` project runs the same files in `pnpm test`. The
 * MySQL integration test joins only with MIGRATE_MYSQL_IT=1 (it needs Docker).
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'migrate',
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/fixtures/**'],
  },
})
