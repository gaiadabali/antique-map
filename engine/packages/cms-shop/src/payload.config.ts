/**
 * Old East Indies' Payload config (PLAN-V2 §3, DR-17): the shop's own CMS on its own database
 * (`indies_shop`), served by the shop app alone (`engine/apps/shop`). What every CMS shares — the
 * admin's frame, the locales, mail, CSRF/CORS, the adapter, the jobs, the generated types, the
 * upload limits — is `@engine/cms-core/config`'s; here are the shop's collections and globals, its
 * admin views and components (`@engine/cms-shop/admin/views`), the media storage and the shop's own
 * migrations.
 *
 * Importing this never touches a database and never throws for want of a secret: the build
 * imports it with none of them (CONVENTIONS.md §12). The pool opens, and pending migrations apply
 * under the advisory lock, on the first `getPayload()` (`@engine/cms-core/db`).
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildCmsConfig, cmsConfig, type Env } from '@engine/cms-core/config'
import type { Config, SanitizedConfig } from 'payload'

import { migrations } from './migrations'
import { shopAdminViews, shopCollections, shopGlobals, shopPlugins } from './registries'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const VIEWS = '@engine/cms-shop/admin/views'

/** The config's input, before Payload sanitises it — `env` injectable so tests compare contexts. */
export function shopConfig(env: Env = process.env): Config {
  return cmsConfig({
    env,
    titleSuffix: ' · Old East Indies',
    // The shop's own icon, served by the shop app from its `public/` (same origin: the CSP holds).
    icons: [
      { rel: 'icon', type: 'image/x-icon', url: '/favicon.ico' },
      { rel: 'apple-touch-icon', url: '/apple-touch-icon.png' },
    ],
    components: {
      Logo: `${VIEWS}#AdminLogo`,
      Icon: `${VIEWS}#AdminIcon`,
      Nav: `${VIEWS}#AdminNav`,
      dashboard: `${VIEWS}#HomeView`,
    },
    views: shopAdminViews(),
    collections: shopCollections(),
    globals: shopGlobals(),
    jobs: { tasks: [], workflows: [] },
    plugins: shopPlugins(env),
    migrationDir: path.resolve(dirname, 'migrations'),
    migrations,
    typesOutputFile: path.resolve(dirname, '../payload-types.ts'),
  })
}

/** The config every process runs: the app, the CLI and the tests that drive REST. */
export function buildShopConfig(config: Config = shopConfig()): Promise<SanitizedConfig> {
  return buildCmsConfig(config)
}

export default buildShopConfig()
