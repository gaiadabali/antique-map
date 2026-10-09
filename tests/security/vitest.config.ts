/**
 * The security suite's own Vitest config (TASKS.md 10.1). The root config's three projects match
 * `engine/**` only, so `tests/security/**` runs through this one:
 *
 *   pnpm vitest run --config tests/security/vitest.config.ts
 *
 * The suite drives the engine's real code (the CMS config, the payment and fulfilment cores) and,
 * for the `*.db.test.ts` files, a real Postgres named by `CMS_TEST_POSTGRES_URL` (they skip, a
 * setup state, without it). `payload` and `react-dom/server`, imported by a test directly, resolve to the copy the cms
 * package installs, so the engine's own imports and the tests' share a single instance.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const cms = path.join(root, 'engine/packages/cms/node_modules')

export default defineConfig({
  resolve: {
    alias: [
      { find: /^payload$/, replacement: `${cms}/payload/dist/index.js` },
      { find: /^react-dom\/server$/, replacement: `${cms}/react-dom/server.node.js` },
    ],
  },
  test: {
    name: 'security',
    root,
    include: ['tests/security/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/.claude/**', 'tests/security/plants/**'],
    // One migrated and one pushed template database, built once: each file clones the pushed one.
    globalSetup: ['engine/packages/cms/src/db/test-templates.global-setup.test-support.ts'],
    testTimeout: 60_000,
    hookTimeout: 180_000,
    // One Payload instance per file, each on its own database; files run one after the other so a
    // laptop's Postgres is not asked for six pushed schemas at once.
    fileParallelism: false,
  },
})
