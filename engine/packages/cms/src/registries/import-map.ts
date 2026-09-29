/**
 * `pnpm --filter @engine/cms generate:importmap [app…]` — each storefront app's
 * `src/app/(payload)/admin/importMap.js`, generated from the one config (TASKS.md 3.2.d, checked by
 * 2.2.g). With no app named, every app under `engine/apps/` that mounts the admin.
 *
 * The map lists every admin component the config references — registered views (`./views`),
 * the storage plugin's client handler, Payload's own — by package specifier, never by a path
 * relative to one app, so both apps' maps come out identical. Run with `BRAND` unset, as the SCH
 * lead does after a wave; CI regenerates with `BRAND` unset and once per brand and fails on a diff.
 * The output is Payload's own, unformatted: Payload's dev server rewrites the same file whenever
 * the config gains a component (so a new view never renders as nothing), and must find it equal.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { generateImportMap } from 'payload'

import { finish } from '../db/cli'

const appsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../apps')
const ADMIN_PATH = 'src/app/(payload)/admin'
const ADMIN_DIR = path.join(...ADMIN_PATH.split('/'))

const mountsAdmin = (app: string) => fs.existsSync(path.join(appsDir, app, ADMIN_DIR))

const named = process.argv.slice(2).filter((arg) => !arg.startsWith('-'))
const apps = named.length
  ? named
  : fs.existsSync(appsDir)
    ? fs.readdirSync(appsDir).filter(mountsAdmin)
    : []

process.env.DISABLE_PAYLOAD_HMR = 'true'
process.env.PAYLOAD_SECRET ||= 'import-map-generation-only-never-signs-anything'
let code = 0
try {
  const missing = apps.filter((app) => !mountsAdmin(app))
  if (apps.length === 0 || missing.length > 0) {
    throw new Error(
      `no admin mount at engine/apps/${missing[0] ?? '<app>'}/${ADMIN_PATH} — the apps' (payload) mounts are TASKS.md 4.1.a's`,
    )
  }
  const { default: config } = await import('../payload.config')
  for (const app of apps) {
    // Payload finds `src/app/(payload)/admin/importMap.js` under ROOT_DIR (default: the cwd).
    process.env.ROOT_DIR = path.join(appsDir, app)
    await generateImportMap(await config, { force: true, log: false })
    console.log(`generate:importmap: wrote engine/apps/${app}/${ADMIN_PATH}/importMap.js`)
  }
} catch (error) {
  code = 1
  console.error(`generate:importmap: ${error instanceof Error ? error.message : String(error)}`)
}
await finish(undefined, code)
