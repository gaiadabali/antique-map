/**
 * The one Payload config (ARCHITECTURE.md §2): one CMS and one database serving both sites, the
 * gallery and the shop, from one process, until phase 26 (PLAN-V2 §5). Nothing in it depends on
 * which site a request is for: the schema, the generated types and the import map are the same in
 * every context, and CI regenerates the last two and fails on a diff (`pnpm check:generated`).
 *
 * What every CMS shares — the admin's frame, the locales, mail, CSRF/CORS, the adapter, the jobs,
 * the generated types, the upload limits — is `@engine/cms-core/config`'s; here are this CMS's
 * collections, globals, views, plugins, migrations and admin components. The shop's own CMS is
 * `@engine/cms-shop/payload.config`.
 *
 * Importing this never touches a database and never throws for want of a secret: the build
 * imports it with none of them (CONVENTIONS.md §12). The pool opens, and pending migrations
 * apply, on the first `getPayload()` (`@engine/cms-core/db`).
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildCmsConfig, cmsConfig, type Env } from '@engine/cms-core/config'
import type { Config, SanitizedConfig } from 'payload'

import { migrations } from './migrations'
import { registeredCollections, registeredGlobals } from './registries/collections'
import { jobTasks, jobWorkflows } from './registries/jobs'
import { registeredPlugins } from './registries/plugins'
import { adminViews } from './registries/views'

export { CMS_LOCALES, COOKIE_PREFIX, type CmsLocale } from '@engine/cms-core/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const VIEWS = '@engine/cms/admin/views'

/** The config's input, before Payload sanitises it — `env` injectable so tests compare contexts. */
export function engineConfig(env: Env = process.env): Config {
  return cmsConfig({
    env,
    titleSuffix: ' · Indies',
    // The shop's own icon (`public/shop`, same origin, so the admin CSP holds), not Payload's.
    icons: [
      { rel: 'icon', type: 'image/x-icon', url: '/shop/favicon.ico' },
      { rel: 'apple-touch-icon', url: '/shop/apple-touch-icon.png' },
    ],
    components: {
      Logo: `${VIEWS}#AdminLogo`,
      Icon: `${VIEWS}#AdminIcon`,
      Nav: `${VIEWS}#AdminNav`,
      dashboard: `${VIEWS}#HomeView`,
    },
    views: adminViews(),
    collections: registeredCollections(),
    globals: registeredGlobals(),
    jobs: { tasks: jobTasks(), workflows: jobWorkflows() },
    plugins: registeredPlugins(env),
    migrationDir: path.resolve(dirname, 'migrations'),
    migrations,
    typesOutputFile: path.resolve(dirname, '../payload-types.ts'),
  })
}

/**
 * The config every process runs — the app, the CLI and the tests that drive REST
 * (`@engine/cms-core/config` `buildCmsConfig`). A test that calls `buildConfig()` itself runs
 * without the temp-file cleanup and the locks collection's access.
 */
export function buildEngineConfig(config: Config = engineConfig()): Promise<SanitizedConfig> {
  return buildCmsConfig(config)
}

export default buildEngineConfig()
