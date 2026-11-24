/**
 * `pnpm --filter @engine/cms generate:importmap [app…]` — today's app's
 * `src/app/(payload)/admin/importMap.js`, generated from the one config (TASKS.md 3.2.d, checked by
 * 2.2.g; `@engine/cms-core/registries/import-map`). The shop app's map is `@engine/cms-shop`'s.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { runImportMapCli } from '@engine/cms-core/registries/import-map'

await runImportMapCli({
  appsDir: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../apps'),
  apps: ['web'],
  loadConfig: async () => (await import('../payload.config')).default,
})
