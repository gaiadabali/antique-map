/**
 * The one Payload config (TASKS.md 3.2.a, ARCHITECTURE.md §2), instantiated once per brand
 * process against that brand's database. It is **brand-independent** in everything that reaches
 * the schema, the generated types or the import map: Payload stores `_locale` as a Postgres
 * enum, adds storage fields only while a plugin is enabled and writes admin components into a
 * generated import map, so a config shaped by `BRAND` would give two brands two schemas. CI
 * regenerates all three with `BRAND` unset and once per brand, and fails on a diff (2.2.g).
 *
 * `BRAND` may set only: the server URL, CSRF/CORS, the email sender, and admin branding through
 * admin components that read the brand at runtime (ADM) — plus, at request time, module
 * visibility and access (`access/modules`). Everything else is the same for every brand.
 *
 * Importing this never touches a database, never needs a brand and never throws for want of a
 * secret: the build imports it with none of them (CONVENTIONS.md §12). The pool opens, and
 * pending migrations apply, on the first `getPayload()` (`db/adapter`).
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { LOCALE_CODES, type BrandConfig, type LocaleCode } from '@engine/config/schema'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { buildConfig, type Config, type EmailAdapter } from 'payload'
import { en } from 'payload/i18n/en'
import { id } from 'payload/i18n/id'

import { activeBrand, brandFrom } from './access/brand'
import { siteOrigin, trustedOrigins } from './access/origins'
import { USERS_SLUG } from './access/roles'
import { buildDatabaseAdapter } from './db/adapter'
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

/** The database default and the admin's editing default; each brand's own set is its routes'. */
const DEFAULT_LOCALE: LocaleCode = 'en'
const LOCALE_LABELS: Record<LocaleCode, string> = {
  en: 'English',
  id: 'Bahasa Indonesia',
  nl: 'Nederlands',
}

/**
 * Mail through SMTP — Mailpit locally, the brand's provider on a host. With no `SMTP_HOST`,
 * Payload writes mail to the console (never an ethereal test account, which would call out to
 * the network). The transport is not verified at start: that would open a connection while the
 * config loads; `/api/health` is where reachability is reported.
 */
function emailAdapter(env: Env, brand: BrandConfig | null): Promise<EmailAdapter> | undefined {
  const host = env.SMTP_HOST?.trim()
  const fromAddress = env.SMTP_FROM_ADDRESS?.trim() || brand?.identity.contact.email
  if (!host || !fromAddress) return undefined
  const port = Number(env.SMTP_PORT?.trim() || 587)
  const user = env.SMTP_USER?.trim()
  const pass = env.SMTP_PASS
  return nodemailerAdapter({
    defaultFromAddress: fromAddress,
    defaultFromName: env.SMTP_FROM_NAME?.trim() || brand?.name || fromAddress,
    skipVerify: true,
    transportOptions: {
      host,
      port,
      secure: port === 465,
      ...(user && pass ? { auth: { user, pass } } : {}),
    },
  })
}

/** The config's input, before Payload sanitises it — `env` injectable so tests compare brands. */
export function engineConfig(env: Env = process.env): Config {
  const brand = brandFrom(env)
  const origins = trustedOrigins(env, brand)
  const email = emailAdapter(env, brand)
  return {
    admin: {
      user: USERS_SLUG,
      // Gravatar would send a hash of each editor's email to a third party on every page.
      avatar: 'default',
      components: { views: adminViews() },
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
    // Nothing reads content through GraphQL: loaders use the Local API, the sister API is REST.
    graphQL: { disable: true },
    // The admin in English unless the user picks Indonesian (ARCHITECTURE.md §11).
    i18n: { supportedLanguages: { en, id }, fallbackLanguage: 'en' },
    // Run by the cron-called route (/api/x/cron/jobs), never autoRun (ARCHITECTURE.md §10).
    jobs: { tasks: jobTasks(), workflows: jobWorkflows() },
    localization: {
      // The superset in every database; a brand's own locales are enforced by its routes, and
      // the admin's locale picker offers only those (read per request, so the schema is shared).
      locales: LOCALE_CODES.map((code) => ({ code, label: LOCALE_LABELS[code] })),
      defaultLocale: DEFAULT_LOCALE,
      fallback: true,
      filterAvailableLocales: ({ locales }) => {
        const supported = activeBrand()?.locales.supported
        return supported
          ? locales.filter((locale) => supported.includes(locale.code as LocaleCode))
          : locales
      },
    },
    plugins: registeredPlugins(env),
    secret: env.PAYLOAD_SECRET ?? '',
    telemetry: false,
    typescript: {
      outputFile: path.resolve(dirname, '../payload-types.ts'),
      // Only `generate:types`, run by the SCH lead after a wave merges, writes the shared file —
      // never a lane's dev server (PARALLEL-TRACKS.md §3.2).
      autoGenerate: false,
      // The v4 default, adopted now.
      strictDraftTypes: true,
    },
  }
}

export default buildConfig(engineConfig())
