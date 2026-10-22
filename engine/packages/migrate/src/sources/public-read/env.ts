/**
 * Where raw output goes: `LEGACY_DATA_DIR`, outside git (MIGRATION.md §4).
 * Read from the environment, else from the workspace's `.env.local` — only
 * that one key, never the rest of the file. Relative CLI paths resolve
 * against the directory the command was typed in (`INIT_CWD` under pnpm).
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { parseEnv } from 'node:util'

export function invocationDir(): string {
  return process.env.INIT_CWD ?? process.cwd()
}

export function resolveFromInvocation(path: string): string {
  return isAbsolute(path) ? path : resolve(invocationDir(), path)
}

export function workspaceRoot(from = invocationDir()): string | null {
  let dir = resolve(from)
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

export function legacyDataDir(explicit?: string): string {
  if (explicit) return resolveFromInvocation(explicit)
  const fromEnv = process.env.LEGACY_DATA_DIR
  if (fromEnv) return resolveFromInvocation(fromEnv)
  const root = workspaceRoot()
  const envFile = root === null ? null : join(root, '.env.local')
  if (envFile !== null && existsSync(envFile)) {
    const value = parseEnv(readFileSync(envFile, 'utf8')).LEGACY_DATA_DIR
    if (value) return isAbsolute(value) ? value : resolve(root ?? '.', value)
  }
  throw new Error('LEGACY_DATA_DIR is not set (environment or .env.local) and no --data-dir given')
}
