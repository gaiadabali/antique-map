/**
 * The gallery browse/search e2e's environment (TASKS.md 5.1.d): the one production server on this
 * worktree's port, the two hostnames by Host header, and the owner the fixtures are made as.
 *
 * The owner is the same account the other suite uses (`tests/e2e/admin/accounts`): the seed creates
 * no user (`seed/env.ts` carries the database and a dev secret alone), so the owner is signed in
 * with `POST /api/users/login`, or bootstrapped with `POST /api/users/first-register` when the
 * database has none — the `hosts/admin-origin.spec.ts` pattern. Credentials come from the
 * environment when it names them (the shop-fulfilment gate's names), else the harness' own.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ACCOUNTS, PASSWORD } from '../../admin/accounts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')

function readEnvFile(path: string): Map<string, string> {
  if (!existsSync(path)) return new Map()
  const values = new Map<string, string>()
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
    if (match) values.set(match[1]!, match[2]!.replace(/^(['"])(.*)\1$/, '$2'))
  }
  return values
}

const LOCAL = readEnvFile(join(root, '.env.local'))
const envVar = (key: string): string | undefined => process.env[key] ?? LOCAL.get(key)

/** One server's port: CI's 4200 unless `E2E_PORT` names this worktree's own. */
export const PORT = process.env.E2E_PORT ?? envVar('PORT') ?? '4200'

/** The `request` fixture uses Node's resolver, which may not know `*.localhost`; a plain IP with
 * the real `Host` header reaches the same vhost Chromium resolves by name. */
export const BASE_URL = `http://127.0.0.1:${PORT}`
export const HOST_HEADER = { Host: `shop.localhost:${PORT}` }
/** The real hosts, for page navigation (Chromium resolves `*.localhost` itself). */
export const GALLERY_ORIGIN = `http://gallery.localhost:${PORT}`
export const SHOP_ORIGIN = `http://shop.localhost:${PORT}`

export const OWNER = {
  email: process.env.E2E_OWNER_EMAIL ?? ACCOUNTS.owner.email,
  password: process.env.E2E_OWNER_PASSWORD ?? PASSWORD,
}
