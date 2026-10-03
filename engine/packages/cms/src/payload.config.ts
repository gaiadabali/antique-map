/**
 * The one Payload config (ARCHITECTURE.md §2): one CMS and one database serving both sites, the
 * gallery and the shop, from one process. Nothing in it depends on which site a request is for:
 * the schema, the generated types and the import map are the same in every context, and CI
 * regenerates the last two and fails on a diff (`pnpm check:generated`).
 *
 * What the environment may set: the server URL and CSRF/CORS (`SITE_URL`, `access/origins`), the
 * mail transport and sender (`SMTP_*`), the database and the buckets.
 *
 * Importing this never touches a database and never throws for want of a secret: the build
 * imports it with none of them (CONVENTIONS.md §12). The pool opens, and pending migrations
 * apply, on the first `getPayload()` (`db/adapter`).
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { multipartUploadOptions } from '@engine/media/storage'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { buildConfig, type Config, type EmailAdapter, type SanitizedConfig } from 'payload'
import { en } from 'payload/i18n/en'
import { id } from 'payload/i18n/id'

import { restrictLockedDocuments } from './access/locked-documents'
import { siteOrigin, trustedOrigins } from './access/origins'
import { USERS_SLUG } from './access/roles'
import { buildDatabaseAdapter } from './db/adapter'
import { removingRequestTempFiles } from './hooks/request-temp-files'
import { migrations } from './migrations'
import { registeredCollections, registeredGlobals } from './registries/collections'
import { jobTasks, jobWorkflows } from './registries/jobs'
import { registeredPlugins } from './registries/plugins'
import { adminViews } from './registries/views'

type Env = Readonly<Record<string, string | undefined>>

const dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Payload's cookie prefix, left at Payload's own default. The proxy reads the admin-language
 * cookie as `${cookiePrefix}-lng` and defaults to the same `payload` (`@engine/http/proxy`,
 * `decide.ts`), so 4.1 passes nothing; change both together or neither.
 */
export const COOKIE_PREFIX = 'payload'

/**
 * The content locales, both sites alike (DR-12): English — the default and the fallback — and
 * Indonesian. `nl` went with the multi-brand plan (TASKS.md 2.4.a). Declared here, not read from
 * `@engine/config/constants`, whose list still carries `nl` until TASKS.md 2.2 trims it.
 */
export const CMS_LOCALES = ['en', 'id'] as const
export type CmsLocale = (typeof CMS_LOCALES)[number]
const DEFAULT_LOCALE: CmsLocale = 'en'
const LOCALE_LABELS: Record<CmsLocale, string> = {
  en: 'English',
  id: 'Bahasa Indonesia',
}

/**
 * Mail through SMTP — Mailpit locally, the provider on a host. With no `SMTP_HOST` or no
 * `SMTP_FROM_ADDRESS`, Payload writes mail to the console (never an ethereal test account, which
 * would call out to the network). The transport is not verified at start: that would open a
 * connection while the config loads; `/api/health` is where reachability is reported.
 */
function emailAdapter(env: Env): Promise<EmailAdapter> | undefined {
  const host = env.SMTP_HOST?.trim()
  const fromAddress = env.SMTP_FROM_ADDRESS?.trim()
  if (!host || !fromAddress) return undefined
  const port = Number(env.SMTP_PORT?.trim() || 587)
  const user = env.SMTP_USER?.trim()
  const pass = env.SMTP_PASS
  return nodemailerAdapter({
    defaultFromAddress: fromAddress,
    defaultFromName: env.SMTP_FROM_NAME?.trim() || fromAddress,
    skipVerify: true,
    transportOptions: {
      host,
      port,
      secure: port === 465,
      ...(user && pass ? { auth: { user, pass } } : {}),
    },
  })
}

/** The config's input, before Payload sanitises it — `env` injectable so tests compare contexts. */
export function engineConfig(env: Env = process.env): Config {
  // No brand any more: `SITE_URL`'s origin until `access/origins` lists both sites' (TASKS.md 2.2.c).
  const origins = trustedOrigins(env, null)
  const email = emailAdapter(env)
  return {
    admin: {
      user: USERS_SLUG,
      // Gravatar would send a hash of each editor's email to a third party on every page.
      avatar: 'default',
      components: { views: adminViews() },
      dashboard: {
        defaultLayout: [
          { widgetSlug: 'orders-to-act-on', width: 'medium' },
          { widgetSlug: 'new-leads', width: 'medium' },
          { widgetSlug: 'collections', width: 'full' },
        ],
        widgets: [
          {
            slug: 'orders-to-act-on',
            label: { en: 'Orders to act on', id: 'Pesanan perlu tindakan' },
            Component: '@engine/cms/admin/widgets#OrdersToActOnWidget',
            minWidth: 'medium',
          },
          {
            slug: 'new-leads',
            label: { en: 'New leads', id: 'Calon pembeli baru' },
            Component: '@engine/cms/admin/widgets#NewLeadsWidget',
            minWidth: 'medium',
          },
        ],
      },
    },
    collections: registeredCollections(),
    globals: registeredGlobals(),
    cookiePrefix: COOKIE_PREFIX,
    cors: origins,
    csrf: origins,
    ...(siteOrigin(env) ? { serverURL: siteOrigin(env) } : {}),
    db: buildDatabaseAdapter({
      env,
      migrationDir: path.resolve(dirname, 'migrations'),
      migrations,
    }),
    ...(email ? { email } : {}),
    // Nothing reads content through GraphQL: loaders use the Local API.
    graphQL: { disable: true },
    // The admin in English unless the user picks Indonesian (ARCHITECTURE.md §11).
    i18n: { supportedLanguages: { en, id }, fallbackLanguage: 'en' },
    // Run by the cron-called route (/api/x/cron/jobs), never autoRun (ARCHITECTURE.md §10).
    jobs: { tasks: jobTasks(), workflows: jobWorkflows() },
    localization: {
      // Both sites serve both locales, so the admin offers both to everyone.
      locales: CMS_LOCALES.map((code) => ({ code, label: LOCALE_LABELS[code] })),
      defaultLocale: DEFAULT_LOCALE,
      fallback: true,
    },
    plugins: registeredPlugins(env),
    secret: env.PAYLOAD_SECRET ?? '',
    telemetry: false,
    typescript: {
      outputFile: path.resolve(dirname, '../payload-types.ts'),
      // Only `generate:types`, run by the wave's schema lead, writes the shared file — never a
      // lane's dev server (WORKFLOW.md §2).
      autoGenerate: false,
      // The v4 default, adopted now.
      strictDraftTypes: true,
    },
    // How a multipart body is parsed: the media upload limit, streamed to the OS temp folder
    // rather than held in memory (`@engine/media/storage` `multipartUploadOptions`, TASKS.md 8.3);
    // every endpoint removes what its request streamed there (`buildEngineConfig`).
    upload: multipartUploadOptions(),
  }
}

/**
 * The config every process runs — the app, the CLI and the tests that drive REST: Payload's
 * `buildConfig()`, then every endpoint made to remove its request's upload temp files, which only
 * the built config holds (`hooks/request-temp-files`, TASKS.md 8.3.h), and the access of the
 * locks collection Payload adds while building (`access/locked-documents`, TASKS.md 3.5.d). A
 * test that calls `buildConfig()` itself runs without either.
 */
export async function buildEngineConfig(config: Config = engineConfig()): Promise<SanitizedConfig> {
  return restrictLockedDocuments(removingRequestTempFiles(await buildConfig(config)))
}

export default buildEngineConfig()
