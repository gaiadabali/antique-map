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

/**
 * PORT and DB_SUFFIX claimed by every worktree except `target`, read from
 * each one's .env.local: [{ path, port, suffix }].
 */
export function otherClaims(target, cwd) {
  const self = pathKey(target)
  return listWorktrees(cwd)
    .filter((entry) => pathKey(entry.path) !== self)
    .map((entry) => {
      const env = readEnvFile(join(entry.path, '.env.local'))
      const port = Number.parseInt(env.get('PORT') ?? '', 10)
      return {
        path: entry.path,
        port: Number.isInteger(port) ? port : null,
        suffix: env.get('DB_SUFFIX') ?? null,
      }
    })
}
