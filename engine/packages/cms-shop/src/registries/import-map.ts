/**
 * `pnpm --filter @engine/cms-shop generate:importmap [app…]` — the shop app's
 * `src/app/(payload)/admin/importMap.js`, generated from the shop's config
 * (`@engine/cms-core/registries/import-map`; checked by `pnpm check:generated`).
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { runImportMapCli } from '@engine/cms-core/registries/import-map'

await runImportMapCli({
  appsDir: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../apps'),
  apps: ['shop'],
  loadConfig: async () => (await import('../payload.config')).default,
})
