/**
 * `generate:importmap [app…]` for a CMS — each app's `src/app/(payload)/admin/importMap.js`,
 * generated from the CMS's config (TASKS.md 3.2.d, checked by 2.2.g). With no app named, every app
 * under `engine/apps/` that mounts the admin and whose config is this CMS's (`apps`).
 *
 * The map lists every admin component the config references — registered views, the storage
 * plugin's client handler, Payload's own — by package specifier, never by a path relative to one
 * app. The wave's schema lead runs it after a wave; `pnpm check:generated` regenerates it and fails
 * on a diff. The output is Payload's own, unformatted: Payload's dev server rewrites the same file
 * whenever the config gains a component, and must find it equal.
 */
import fs from 'node:fs'
import path from 'node:path'

import { generateImportMap, type SanitizedConfig } from 'payload'

import { finish } from '../db/schema'

const ADMIN_PATH = 'src/app/(payload)/admin'
const ADMIN_DIR = path.join(...ADMIN_PATH.split('/'))

export type ImportMapCli = {
  /** `engine/apps`. */
  readonly appsDir: string
  /** The apps whose admin this CMS serves, when none is named. */
  readonly apps: readonly string[]
  readonly loadConfig: () => Promise<SanitizedConfig>
  /** The command's name in its messages: `generate:importmap`. */
  readonly argv?: readonly string[]
}

export async function runImportMapCli(options: ImportMapCli): Promise<void> {
  const mountsAdmin = (app: string) => fs.existsSync(path.join(options.appsDir, app, ADMIN_DIR))
  const named = (options.argv ?? process.argv.slice(2)).filter((arg) => !arg.startsWith('-'))
  const apps = named.length ? named : options.apps.filter(mountsAdmin)

  process.env.DISABLE_PAYLOAD_HMR = 'true'
  process.env.PAYLOAD_SECRET ||= 'import-map-generation-only-never-signs-anything'
  let code = 0
  try {
    const missing = apps.filter((app) => !mountsAdmin(app))
    if (apps.length === 0 || missing.length > 0) {
      throw new Error(`no admin mount at engine/apps/${missing[0] ?? '<app>'}/${ADMIN_PATH}`)
    }
    const config = await options.loadConfig()
    for (const app of apps) {
      // Payload finds `src/app/(payload)/admin/importMap.js` under ROOT_DIR (default: the cwd).
      process.env.ROOT_DIR = path.join(options.appsDir, app)
      await generateImportMap(config, { force: true, log: false })
      console.log(`generate:importmap: wrote engine/apps/${app}/${ADMIN_PATH}/importMap.js`)
    }
  } catch (error) {
    code = 1
    console.error(`generate:importmap: ${error instanceof Error ? error.message : String(error)}`)
  }
  await finish(undefined, code)
}
