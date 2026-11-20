/**
 * Test support only — how a real-database test makes its database. With the template databases
 * (`./test-templates.global-setup.test-support.ts`: one migrated, one pushed, built once per run) a test's
 * database is `CREATE DATABASE … TEMPLATE …`, a file copy, not a schema built from scratch. Without
 * them (a test run through a config that has no global setup) it is a plain empty one, so every
 * helper works both ways.
 */
export type TemplateKind = 'migrated' | 'pushed'

/** The env var the global setup sets to a template's database name, per kind. */
export const TEMPLATE_ENV: Record<TemplateKind, string> = {
  migrated: 'CMS_TEST_TEMPLATE_MIGRATED',
  pushed: 'CMS_TEST_TEMPLATE_PUSHED',
}

type Admin = { query: (text: string) => Promise<unknown> }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Postgres refuses a clone while another session is connected to the template (SQLSTATE 55006). */
const sourceBusy = (error: unknown) =>
  (error as { code?: string } | null)?.code === '55006' ||
  /being accessed by other users/.test(String((error as Error | null)?.message))

/**
 * Creates `database` on `admin`'s server: a clone of the `kind` template when the run has one,
 * otherwise an empty database. Retries while the template is briefly busy.
 */
export async function createTestDatabase(
  admin: Admin,
  database: string,
  kind?: TemplateKind,
): Promise<void> {
  const template = kind ? process.env[TEMPLATE_ENV[kind]] : undefined
  if (!template) {
    await admin.query(`CREATE DATABASE "${database}"`)
    return
  }
  for (let attempt = 0; ; attempt++) {
    try {
      await admin.query(`CREATE DATABASE "${database}" TEMPLATE "${template}"`)
      return
    } catch (error) {
      if (!sourceBusy(error) || attempt >= 60) throw error
      await sleep(250 + Math.floor(Math.random() * 250))
    }
  }
}

/**
 * The PAYLOAD_DEV_PUSH value for a config over a pushed-template clone: none. The clone already
 * has the schema, and re-running drizzle push on it means introspecting every table (slow, and its
 * connections time out when many files do it at once). With no template, push as before.
 */
export const pushEnv = (): { PAYLOAD_DEV_PUSH?: string } =>
  process.env[TEMPLATE_ENV.pushed] ? {} : { PAYLOAD_DEV_PUSH: '1' }
