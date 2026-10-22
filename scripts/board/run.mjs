// One read-modify-write of the live board: tick → close finished tasks → drop their
// **Now** rows → rebuild the progress table. Shared by `scripts/progress.mjs`, the git
// pre-commit hook and the Claude Code hook, so every path updates the board alike.
import { execFileSync } from 'node:child_process'
import { closeSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { syncTasks } from './sync.mjs'
import { buildTable, replaceTable } from './table.mjs'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function git(args, cwd) {
  return execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim()
}

/**
 * True in an agent's worktree: its TASKS.md is a copy, and rewriting it hides progress and
 * collides at merge. False in the main checkout, or outside git.
 */
export function isWorktreeCopy(root = ROOT) {
  try {
    const gitDir = resolve(root, git(['rev-parse', '--git-dir'], root))
    const common = resolve(root, git(['rev-parse', '--git-common-dir'], root))
    return gitDir !== common
  } catch {
    return false
  }
}

/** Today in local time, YYYY-MM-DD. */
export function today(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** HEAD's short sha — the merge just made, when a task closes after its merge. */
export function headSha(root = ROOT) {
  return git(['rev-parse', '--short', 'HEAD'], root)
}

function withLock(lock, fn) {
  const deadline = Date.now() + 5000
  let fd
  for (;;) {
    try {
      fd = openSync(lock, 'wx')
      break
    } catch {
      if (Date.now() > deadline) {
        throw new Error(`${lock} is held; if no session is syncing the board, delete it`)
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100)
    }
  }
  try {
    return fn()
  } finally {
    closeSync(fd)
    unlinkSync(lock)
  }
}

/** The board after a sync, without touching the file. */
export function computeBoard(text, { date, sha, tick = [] }) {
  const sync = syncTasks(text, { date, sha, tick })
  if (sync.unknown.length > 0) return { ...sync, next: text, total: null }
  const { table, total } = buildTable(sync.text)
  return { ...sync, next: replaceTable(sync.text, table), total }
}

/**
 * Syncs `<root>/TASKS.md`. `write: false` only reports. Returns the computeBoard result
 * plus `changed`. Throws in a worktree copy when asked to write.
 */
export function runSync({ root = ROOT, tick = [], sha, date = today(), write = true } = {}) {
  const file = join(root, 'TASKS.md')
  if (write && isWorktreeCopy(root)) {
    throw new Error('this is a worktree copy of TASKS.md; sync the main checkout instead')
  }
  const work = () => {
    const text = readFileSync(file, 'utf8')
    const result = computeBoard(text, { date, sha: sha ?? headSha(root), tick })
    const changed = result.next !== text
    if (write && changed && result.unknown.length === 0) writeFileSync(file, result.next)
    return { ...result, changed }
  }
  return write ? withLock(join(root, 'TASKS.md.lock'), work) : work()
}

/**
 * One locked read-modify-write of `<root>/TASKS.md` for an edit that is not a tick (an agent
 * starting a task): `edit(text)` returns `{ text, … }`; the progress table is rebuilt after.
 */
export function editBoard(root, edit) {
  const file = join(root, 'TASKS.md')
  return withLock(join(root, 'TASKS.md.lock'), () => {
    const text = readFileSync(file, 'utf8')
    const edited = edit(text)
    const result = computeBoard(edited.text, { date: today(), sha: headSha(root) })
    if (result.next !== text) writeFileSync(file, result.next)
    return { ...edited, total: result.total }
  })
}
