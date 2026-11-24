// The few git calls the worktree helper needs. execFileSync with an argument
// array (no shell), so it behaves the same under Git Bash, PowerShell and a
// Linux shell.
import { execFileSync } from 'node:child_process'
import { join, resolve } from 'node:path'

import { readEnvFile } from './env-file.mjs'

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

/** A path normalised for comparison: resolved, forward slashes, and case-folded on Windows. */
export function pathKey(path) {
  const normal = resolve(path).replace(/\\/g, '/').replace(/\/+$/, '')
  return process.platform === 'win32' ? normal.toLowerCase() : normal
}

/** The root of the worktree containing `cwd`; throws when `cwd` is not inside one. */
export function topLevel(cwd) {
  return resolve(git(['rev-parse', '--show-toplevel'], cwd).trim())
}

/** Every worktree of the repository, main checkout first: [{ path, branch }]. */
export function listWorktrees(cwd) {
  const entries = []
  for (const line of git(['worktree', 'list', '--porcelain'], cwd).split(/\r?\n/)) {
    if (line.startsWith('worktree ')) entries.push({ path: resolve(line.slice(9)), branch: null })
    else if (line.startsWith('branch ') && entries.length > 0) {
      entries[entries.length - 1].branch = line.slice(7).replace(/^refs\/heads\//, '')
    }
  }
  return entries
}

/** True when a local branch of that name exists. */
export function branchExists(branch, cwd) {
  try {
    git(['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`], cwd)
    return true
  } catch {
    return false
  }
}

/** Adds a worktree at `dir`: on the existing `branch`, or a new one from `base`. */
export function addWorktree({ dir, branch, base, cwd }) {
  const args = branchExists(branch, cwd)
    ? ['worktree', 'add', dir, branch]
    : ['worktree', 'add', '-b', branch, dir, base]
  return git(args, cwd)
}

/** Where a worktree's env files live: its root, then each app's own (PLAN-V2 §4.4). */
export const ENV_FILES = Object.freeze([
  '.env.local',
  'engine/apps/web/.env.local',
  'engine/apps/shop/.env.local',
])

function portOf(env) {
  const port = Number.parseInt(env.get('PORT') ?? '', 10)
  return Number.isInteger(port) ? port : null
}

/**
 * PORT and DB_SUFFIX claimed by every worktree except `target`, read from each one's
 * .env.local files: [{ path, port, ports, suffix }] — `port` the root file's, `ports` every
 * port any of its files names (the root's and each app's).
 */
export function otherClaims(target, cwd) {
  const self = pathKey(target)
  return listWorktrees(cwd)
    .filter((entry) => pathKey(entry.path) !== self)
    .map((entry) => {
      const files = ENV_FILES.map((file) => readEnvFile(join(entry.path, file)))
      const ports = [...new Set(files.map(portOf).filter((port) => port !== null))]
      const suffix = files.map((env) => env.get('DB_SUFFIX')).find((value) => value) ?? null
      return { path: entry.path, port: portOf(files[0]), ports, suffix }
    })
}
