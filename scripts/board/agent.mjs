// What an agent in its own worktree may do to the live board, from anywhere:
//
//   pnpm tasks:start <task> [--agent <type>]   mark the task 🔄 and add its **Now** row
//   pnpm tasks:report <subtask…>               tick evidenced subtasks as they finish
//
// Both write the MAIN checkout's TASKS.md (never the worktree's copy, which would collide at
// merge), under the board lock, and rebuild the progress table. An agent never ticks a
// **Check** — the Check passes on merged `main` after qa, so only the orchestrator ticks it,
// and a task only closes then. Pure functions here; `scripts/progress.mjs` wires them up.
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'

import { allTasks, parseTasksMd } from '../../engine/tooling/tasks-lint/parse.mjs'

function tasksOf(text) {
  return allTasks(parseTasksMd(text.replace(/\r\n/g, '\n')))
}

/** The main checkout's root, whichever worktree `cwd` is in. */
export function mainCheckoutRoot(cwd) {
  const common = execFileSync('git', ['rev-parse', '--git-common-dir'], {
    cwd,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .toString()
    .trim()
  return dirname(resolve(cwd, common))
}

/** Which of `ids` name a Check subtask (an agent may not tick) and which name nothing. */
export function guardReport(text, ids) {
  const known = new Map()
  for (const task of tasksOf(text)) {
    for (const sub of task.subtasks) known.set(sub.id, sub)
  }
  const checks = []
  const unknown = []
  for (const id of ids) {
    const sub = known.get(id)
    if (!sub) unknown.push(id)
    else if (sub.isCheck) checks.push(id)
  }
  return { checks, unknown }
}

function nowTableEnd(lines) {
  const heading = lines.findIndex((l) => /^## Now\s*$/.test(l))
  if (heading === -1) return -1
  let sep = -1
  for (let i = heading + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) break
    if (/^\|\s*-{2,}/.test(lines[i])) {
      sep = i
      break
    }
  }
  if (sep === -1) return -1
  let end = sep
  while (end + 1 < lines.length && lines[end + 1].startsWith('|')) end++
  return end
}

function plainTitle(task) {
  return task.title
    .replace(/\*\*/g, '')
    .replace(/\s·\sneeds:.*$/, '')
    .replace(/^\d+\.\d+\s+/, '')
    .replace(/👤\s*/g, '')
    .trim()
}

/**
 * Marks `taskId` in flight: appends `— 🔄 <phase>·<wave>` to its line and adds its **Now** row.
 * Returns `{ text, status }` — `started`, `already` (already 🔄), `closed` or `unknown`.
 */
export function startTask(text, taskId, { agent = '—', branch = '', date }) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const task = tasksOf(text).find((t) => t.id === taskId)
  if (!task) return { text, status: 'unknown' }
  if (task.checked) return { text, status: 'closed' }
  if (task.status === 'doing') return { text, status: 'already' }
  if (!task.wave) return { text, status: 'unknown' }
  const phase = taskId.split('.')[0]
  const tag = `${phase}·${task.wave}`
  const lines = text.split(/\r?\n/)
  lines[task.line - 1] = `${lines[task.line - 1].trimEnd()} — 🔄 ${tag}`
  const end = nowTableEnd(lines)
  if (end !== -1) {
    const where = branch ? `\`${branch}\`` : 'agent worktree'
    lines.splice(
      end + 1,
      0,
      `| ${tag} | ${taskId} ${plainTitle(task)} | ${agent} | ${where} | ${date} | |`,
    )
  }
  return { text: lines.join(eol), status: 'started' }
}
