/**
 * The admin's seed screen, server half (`/admin/seeds`; `POST`/`GET /api/x/seed`): runs one of the
 * committed seeds inside this process, so the owner can load updated seed data on staging without
 * a shell on the server. It lives beside the admin it serves, under `(payload)/`, where the app may
 * import the CMS (CONVENTIONS.md §5), and reaches the shop's page seed, which only the app holds.
 *
 * - **Never in production**: the environment is judged as the boot check judges it (DEPLOYMENT.md
 *   §7, fail-closed — anything not plainly local or staging is production), and every action is
 *   refused there. Seeds are for local and staging (DATA.md §2).
 * - **One run at a time**, held in this process: a second press while one runs is refused. A run
 *   outlives the request (`after()`); the screen asks for its state until it ends. A restart loses
 *   the state, never a write — every seed is idempotent and can simply be run again.
 * - **What it runs** is the CLIs' own code: `seedLayer` (`@engine/cms/seed`), the pending pictures'
 *   web sizes, and the shop's built-in pages (`server/shop/pages/seed/pages`). The cache tags the
 *   writes expire are posted to this process's revalidate route at the end, as a CLI posts them.
 */
import 'server-only'

import { deploymentEnvironment } from '@engine/config/boot-check'
import { postCliTags, cliInvalidation } from '@engine/cms/import'
import type { Payload } from '@engine/cms/instance'
import { derivePending, renderDerivatives, renderSeedRun, seedLayer } from '@engine/cms/seed'

import { seedShopPages } from '../../../../server/shop/pages/seed/pages'

export const SEED_ACTIONS = ['vocabulary', 'shop-catalogue', 'shop-pages', 'pictures'] as const
export type SeedAction = (typeof SEED_ACTIONS)[number]

export type SeedState = {
  readonly action: SeedAction
  readonly status: 'running' | 'done' | 'failed'
  readonly startedAt: string
  readonly finishedAt: string | null
  readonly lines: readonly string[]
}

let current: SeedState | null = null

export function isSeedAction(value: unknown): value is SeedAction {
  return (SEED_ACTIONS as readonly unknown[]).includes(value)
}

/** Whether seeds may run here: local or staging, judged as the boot check judges it. */
export function seedsAllowed(env: Readonly<Record<string, string | undefined>> = process.env) {
  const ignore = { refuse() {}, warn() {}, require() {}, problems: [], warnings: [] }
  return (
    deploymentEnvironment(env, ignore as Parameters<typeof deploymentEnvironment>[1]) !==
    'production'
  )
}

export function seedState(): SeedState | null {
  return current
}

/**
 * A run's report as the screen shows it: the totals and every held or rejected row, without the
 * one line per new, updated or unchanged row a CLI prints (thousands for the stock sheets).
 */
export function summaryOf(report: string): string[] {
  return report
    .split('\n')
    .filter((line) => line.trim() !== '')
    .filter((line) => !/^Row \d+ .*\) (new|updated|unchanged)\b/.test(line))
}

async function perform(action: SeedAction, payload: Payload): Promise<string[]> {
  const batch = cliInvalidation()
  const context = batch.context()
  const lines: string[] = []
  if (action === 'vocabulary' || action === 'shop-catalogue') {
    const run = await seedLayer(action, { payload, publish: true, context })
    lines.push(...summaryOf(renderSeedRun(run)))
  }
  if (action === 'shop-pages') {
    lines.push(...(await seedShopPages(payload, { publish: true, context })))
  }
  if (action === 'shop-catalogue' || action === 'pictures') {
    lines.push(renderDerivatives(await derivePending(payload, context)))
  }
  lines.push(await postCliTags(batch))
  return lines
}

/**
 * Starts `action` and answers its first state, or `null` while another run holds the process.
 * The returned promise is the run itself: the route hands it to `after()`.
 */
export function startSeed(
  action: SeedAction,
  payload: Payload,
): { state: SeedState; run: Promise<void> } | null {
  if (current?.status === 'running') return null
  const startedAt = new Date().toISOString()
  current = { action, status: 'running', startedAt, finishedAt: null, lines: [] }
  const run = perform(action, payload).then(
    (lines) => {
      current = { action, status: 'done', startedAt, finishedAt: new Date().toISOString(), lines }
    },
    (error: unknown) => {
      const why = error instanceof Error ? error.message : String(error)
      console.error(`[seed] ${action} failed: ${error instanceof Error ? error.name : 'error'}`)
      current = {
        action,
        status: 'failed',
        startedAt,
        finishedAt: new Date().toISOString(),
        lines: [why.slice(0, 500)],
      }
    },
  )
  return { state: current, run }
}
