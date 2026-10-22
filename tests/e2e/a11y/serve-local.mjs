#!/usr/bin/env node
/**
 * Start this worktree's production build on its own port, the way the Lighthouse and axe runs in
 * docs/gates/performance.md need it (TASKS.md 10.2):
 *
 *   pnpm build   (then copy `.next/static` and `public` into the standalone folder)
 *   node tests/e2e/a11y/serve-local.mjs
 *
 * It reads the worktree's `.env.local` (PORT, DATABASE_URL, the hosts, the keys), binds 0.0.0.0 (a
 * loopback HOSTNAME hangs every storefront page, C13) and keeps the server in the foreground.
 */
/* global process, console */
import { spawn } from 'node:child_process'
import { cpSync, existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const web = join(root, 'engine/apps/web')
// An optional first argument names another copy of the standalone folder (an A/B of two builds).
const standalone = process.argv[2]
  ? resolve(process.argv[2])
  : join(web, '.next/standalone/engine/apps/web')
if (!existsSync(join(standalone, 'server.js'))) {
  console.error('no standalone build: run `pnpm build` first')
  process.exit(1)
}
cpSync(join(web, '.next/static'), join(standalone, '.next/static'), { recursive: true })
if (existsSync(join(web, 'public')))
  cpSync(join(web, 'public'), join(standalone, 'public'), { recursive: true })

const env = { ...process.env }
for (const line of readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const entry = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
  if (entry && env[entry[1]] === undefined) env[entry[1]] = entry[2]
}
env.HOSTNAME = '0.0.0.0'
env.NODE_ENV = 'production'
const child = spawn(process.execPath, ['server.js'], { cwd: standalone, env, stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))
