#!/usr/bin/env node
// `pnpm dev --brand <slug> [--storefront <app>] [--port <n>] [--suffix <lane>] [-- <next dev args>]`
// (TASKS.md 5.6.a, README.md's quick start): `next dev` in the app the brand's config names, with
// the brand's environment (./plan.mjs). Its database is the one `pnpm db:fresh` made with the same
// --brand/--storefront/--suffix; a dev server never migrates one.
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { join } from 'node:path'

import { ArgError, devPlan, parseDevArgs } from './plan.mjs'
import { readEnvFile } from '../worktree/env-file.mjs'
import { topLevel } from '../worktree/git.mjs'

const USAGE = `usage:
  pnpm dev --brand <slug> [--storefront <app>] [--port <n>] [--suffix <lane>] [-- <next dev args>]

  --brand       a brand folder's slug at the repo root; its config's storefront picks the app
  --storefront  for a brand with one config per storefront (site/brand.<storefront>.json): which
  --port        defaults to PORT in .env.local (written by \`pnpm worktree:env\`)
  --suffix      defaults to DB_SUFFIX in .env.local; the database is <brand>_<suffix>[_<storefront>]
                (make it first: pnpm db:fresh with the same --brand/--storefront/--suffix)`

function main(argv) {
  if (parseDevArgs(argv).help) {
    console.log(USAGE)
    return
  }
  const repoRoot = topLevel(process.cwd())
  const local = readEnvFile(join(repoRoot, '.env.local'))
  const plan = devPlan({ repoRoot, argv, local, env: process.env })
  const next = createRequire(join(plan.appDir, 'package.json')).resolve('next/dist/bin/next')
  console.log(
    `[dev] ${plan.brand} on engine/apps/${plan.app} · http://localhost:${plan.port} · database ${plan.database}`,
  )
  const child = spawn(process.execPath, [next, ...plan.nextArgs], {
    cwd: plan.appDir,
    env: plan.env,
    stdio: 'inherit',
  })
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
  child.on('exit', (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0)
  })
}

try {
  main(process.argv.slice(2))
} catch (error) {
  console.error(`dev: ${error.message}`)
  if (error instanceof ArgError) console.error(USAGE)
  process.exitCode = error instanceof ArgError ? 2 : 1
}
