#!/usr/bin/env node
// `node engine/tooling/bundle-scan/cli.mjs [app …]` — TASKS.md 5.5.e, run in CI right after the
// production build of both apps: every engine route's synchronous chunks hold no Payload
// (`./route-chunks.mjs`). Scans each named app, or every `engine/apps/*`; an app that was not
// built, or a build with no engine route, fails — a scan of nothing is not a pass.
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { scanServer } from './route-chunks.mjs'

const repoRoot = process.cwd()
const appsDir = join(repoRoot, 'engine', 'apps')
const named = process.argv.slice(2)
const apps = named.length
  ? named
  : readdirSync(appsDir, { withFileTypes: true })
      .filter(
        (entry) => entry.isDirectory() && existsSync(join(appsDir, entry.name, 'next.config.ts')),
      )
      .map((entry) => entry.name)
      .sort()

let failed = false
for (const app of apps) {
  const serverDir = join(appsDir, app, '.next', 'server')
  const shown = `engine/apps/${app}/.next/server`
  if (!existsSync(serverDir)) {
    console.error(`bundle-scan: ${shown} does not exist — build the app first (pnpm build)`)
    failed = true
    continue
  }
  const { routes, mapped, loads } = scanServer(serverDir)
  if (routes.length === 0) {
    console.error(`bundle-scan: ${shown} has no engine route (app/api/x/**/route.js) to scan`)
    failed = true
    continue
  }
  const bad = routes.filter(({ hits }) => hits.length > 0)
  for (const { route, hits } of bad) {
    console.error(
      `bundle-scan: ${shown}/${route} loads Payload synchronously (ARCHITECTURE.md §15):`,
    )
    for (const hit of hits.slice(0, 8)) console.error(`    ${hit}`)
    if (hits.length > 8) console.error(`    … and ${hits.length - 8} more`)
  }
  console.log(
    `bundle-scan: ${app}: ${routes.length} engine route(s), ${bad.length} bundle cms or payload synchronously; ${mapped}/${loads} chunk load(s) had a .map`,
  )
  failed ||= bad.length > 0
}
process.exit(failed ? 1 : 0)
