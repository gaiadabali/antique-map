#!/usr/bin/env node
// `node ../../tooling/next-port/cli.mjs dev|start [next args…]`, run from an app's folder: starts
// Next on the port the app itself reads (port.mjs), so `pnpm --filter <app> dev` works on any
// port — 3000 unless the shell or the app's .env.local names another (a worktree's own, say).
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

import { resolvePort } from './port.mjs'

const [command, ...rest] = process.argv.slice(2)
if (command !== 'dev' && command !== 'start') {
  console.error('usage: next-port dev|start [next args…]')
  process.exit(2)
}

const appDir = process.cwd()
const envFile = join(appDir, '.env.local')
const port = resolvePort(process.env, existsSync(envFile) ? readFileSync(envFile, 'utf8') : '')
const nextBin = createRequire(join(appDir, 'package.json')).resolve('next/dist/bin/next')

console.log(`next ${command} on port ${port}`)
// PORT goes to the server in its environment as well, and a shell variable outranks .env.local in
// Next's loader, so the app's origins (admin CSRF, absolute links) name the port it listens on.
const child = spawn(process.execPath, [nextBin, command, '--port', port, ...rest], {
  stdio: 'inherit',
  env: { ...process.env, PORT: port },
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)))
