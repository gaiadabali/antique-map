/**
 * A CMS's Payload config, the parts every CMS shares (PLAN-V2 §3) — `@engine/cms-core/config`: the
 * admin's frame (its user collection, no Gravatar, light only, the short date format, the icons,
 * the CMS's own logo, home and sidebar), the locales (English the default and fallback, and
 * Indonesian), the admin's languages, mail through SMTP, CSRF and CORS from the trusted origins, the
 * database adapter with the CMS's migrations, the jobs (run by the cron route, never autoRun), the
 * generated types' path and the upload limits. Each CMS passes its collections, globals, views,
 * plugins, migrations and its own component paths (`CmsConfigOptions`).
 *
 * What the environment may set: the server URL and CSRF/CORS (`SITE_URL`, `access/origins`), the
 * mail transport and sender (`SMTP_*`), the database and the buckets. Building it never touches a
 * database and never throws for want of a secret: the build imports it with none of them
 * (CONVENTIONS.md §12). The pool opens, and pending migrations apply, on the first `getPayload()`.
 */
import { multipartUploadOptions } from '@engine/media/storage'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import {
  buildConfig,
  type AdminViewConfig,
  type CollectionConfig,
  type Config,
  type EmailAdapter,
  type GlobalConfig,
  type Plugin,
  type SanitizedConfig,
  type TaskConfig,
  type WorkflowConfig,
} from 'payload'
import { en } from 'payload/i18n/en'
import { id } from 'payload/i18n/id'

import { restrictLockedDocuments, siteOrigin, trustedOrigins, USERS_SLUG } from '../access'
import { buildDatabaseAdapter, type BundledMigration } from '../db'
import { removingRequestTempFiles } from '../hooks'

export type Env = Readonly<Record<string, string | undefined>>

/**
 * Payload's cookie prefix, left at Payload's own default. The proxy reads the admin-language
 * cookie as `${cookiePrefix}-lng` and defaults to the same `payload` (`@engine/http/proxy`,
 * `decide.ts`); change both together or neither.
 */
export const COOKIE_PREFIX = 'payload'

/**
 * The content locales, both sites alike (DR-12): English — the default and the fallback — and
 * Indonesian.
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

export type CmsConfigOptions = {
  readonly env: Env
  /** The `<title>` suffix and the icons of the admin, on the admin's own origin. */
  readonly titleSuffix: string
  readonly icons: NonNullable<NonNullable<Config['admin']>['meta']>['icons']
  /** Component paths of the CMS's admin barrel (`@engine/<cms>/admin/views#…`). */
  readonly components: {
    readonly Logo: string
    readonly Icon: string
    readonly Nav: string
    readonly dashboard: string
  }
  readonly views: Record<string, AdminViewConfig>
  readonly collections: CollectionConfig[]
  readonly globals: GlobalConfig[]
  readonly jobs: { tasks: TaskConfig[]; workflows: WorkflowConfig[] }
  readonly plugins: Plugin[]
  /** The CMS's migrations folder (the one `migrate:create` writes to) and their list. */
  readonly migrationDir: string
  readonly migrations: readonly BundledMigration[]
  /** Where `generate:types` writes the CMS's `payload-types.ts`. */
  readonly typesOutputFile: string
}

/** The config's input, before Payload sanitises it. */
export function cmsConfig(options: CmsConfigOptions): Config {
  const { env } = options
  const origins = trustedOrigins(env, null)
  const email = emailAdapter(env)
  return {
    admin: {
      user: USERS_SLUG,
      // Gravatar would send a hash of each editor's email to a third party on every page.
      avatar: 'default',
      // Light only, as both sites (DR-14): no theme switch in the account settings, and no dark
      // admin on a phone set to dark mode. The look itself is the Indies world (TASKS.md 16).
      theme: 'light',
      meta: { titleSuffix: options.titleSuffix, icons: options.icons },
      // Short dates in lists and on a record's status line: "9 Oct 2026, 22:34" fits a column and a
      // phone, where "October 9th 2026, 10:34 PM" did not (TASKS.md 16, the finish review).
      dateFormat: 'd MMM yyyy, HH:mm',
      components: {
        graphics: { Logo: options.components.Logo, Icon: options.components.Icon },
        // The home is Payload's dashboard look laid out by the CMS's sidebar plan, which also
        // sends store staff to their orders with a server redirect before anything renders.
        views: {
          ...options.views,
          dashboard: { Component: options.components.dashboard },
        },
        // The sidebar in the CMS's plan's order (`@engine/cms-core/admin/nav`): Payload's own
        // frame and classes, the entries laid out by the plan, the language link at the foot.
        Nav: options.components.Nav,
      },
    },
    collections: options.collections,
    globals: options.globals,
    cookiePrefix: COOKIE_PREFIX,
    cors: origins,
    csrf: origins,
    ...(siteOrigin(env) ? { serverURL: siteOrigin(env) } : {}),
    db: buildDatabaseAdapter({
      env,
      migrationDir: options.migrationDir,
      migrations: options.migrations,
    }),
    ...(email ? { email } : {}),
    // Nothing reads content through GraphQL: loaders use the Local API.
    graphQL: { disable: true },
    // The admin in English unless the user picks Indonesian (ARCHITECTURE.md §11).
    i18n: { supportedLanguages: { en, id }, fallbackLanguage: 'en' },
    // Run by the cron-called route (/api/x/cron/jobs), never autoRun (ARCHITECTURE.md §10).
    jobs: options.jobs,
    localization: {
      // Both sites serve both locales, so the admin offers both to everyone.
      locales: CMS_LOCALES.map((code) => ({ code, label: LOCALE_LABELS[code] })),
      defaultLocale: DEFAULT_LOCALE,
      fallback: true,
    },
    plugins: options.plugins,
    secret: env.PAYLOAD_SECRET ?? '',
    telemetry: false,
    typescript: {
      outputFile: options.typesOutputFile,
      // Only `generate:types`, run by the wave's schema lead, writes the generated file — never a
      // lane's dev server (WORKFLOW.md §2).
      autoGenerate: false,
      // The v4 default, adopted now.
      strictDraftTypes: true,
    },
    // How a multipart body is parsed: the media upload limit, streamed to the OS temp folder
    // rather than held in memory (`@engine/media/storage` `multipartUploadOptions`, TASKS.md 8.3);
    // every endpoint removes what its request streamed there (`buildCmsConfig`).
    upload: multipartUploadOptions(),
  }
}

/**
 * The config every process runs — the app, the CLI and the tests that drive REST: Payload's
 * `buildConfig()`, then every endpoint made to remove its request's upload temp files, which only
 * the built config holds (`../hooks/request-temp-files`, TASKS.md 8.3.h), and the access of the
 * locks collection Payload adds while building (`../access/locked-documents`, TASKS.md 3.5.d). A
 * test that calls `buildConfig()` itself runs without either.
 */
export async function buildCmsConfig(config: Config): Promise<SanitizedConfig> {
  return restrictLockedDocuments(removingRequestTempFiles(await buildConfig(config)))
}
