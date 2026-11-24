#!/usr/bin/env node
// `pnpm data:seed [--app web|shop] …` — which CMS the seed writes to (PLAN-V2 §4.4: two apps, two
// databases). With no `--app` (or `--app web`) it is today's seed, unchanged: `@engine/cms`'s CLI,
// every option passed on. With `--app shop` it is the shop's own (`./cli.ts`, against
// `indies_shop_<suffix>`), and — when it runs the whole seed (no `--layer`, no `--dry-run`) or
// `--layer pages` — then the storefront's built-in pages (home, partnership, stores), which live
// with their copy in `@engine/storefront` and are written through the shop's CMS. Each step is its
// own `payload run`; the first that fails stops the run with its exit code.
import { spawnSync } from 'node:child_process'
import console from 'node:console'
import process from 'node:process'

const PAGES_CLI = '../storefront/src/server/shop/pages/seed/cli.ts'

const argv = process.argv.slice(2)
const at = argv.indexOf('--app')
const app = at === -1 ? 'web' : argv[at + 1]
const rest = at === -1 ? argv : [...argv.slice(0, at), ...argv.slice(at + 2)]

/** pnpm itself: the one running this script when there is one, else `pnpm` on the PATH. */
function pnpm(args) {
  const exec = process.env.npm_execpath
  const result =
    exec && /\.(c?js|mjs)$/.test(exec)
      ? spawnSync(process.execPath, [exec, ...args], { stdio: 'inherit' })
      : spawnSync('pnpm', args, { stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.error) throw result.error
  return result.status ?? 1
}

function run() {
  if (app === 'web') return pnpm(['--filter', '@engine/cms', 'run', 'seed', ...rest])
  if (app !== 'shop') {
    console.error(
      `--app is web or shop (got '${app ?? ''}'); the gallery's seed comes in phase 25.`,
    )
    return 2
  }
  const layerAt = rest.indexOf('--layer')
  const layer = layerAt === -1 ? null : rest[layerAt + 1]
  const dryRun = rest.includes('--dry-run')
  // `--`: `payload run` keeps only what follows it as the script's own arguments.
  const pages = ['exec', 'payload', 'run', PAGES_CLI, '--', '--app', 'shop']
  if (layer === 'pages') {
    const publish = rest.includes('--publish') ? ['--publish'] : []
    return pnpm(['--filter', '@engine/cms-shop', ...pages, ...publish])
  }
  const status = pnpm(['--filter', '@engine/cms-shop', 'run', 'seed', ...rest])
  if (status !== 0 || layer !== null || dryRun) return status
  return pnpm(['--filter', '@engine/cms-shop', ...pages, '--publish'])
}

process.exit(run())
