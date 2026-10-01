// Keeps TASKS.md's task lines and its **Now** table in step with the subtask
// checkboxes, which are the source of truth (TASKS.md "How to update this file"):
//
//   tickSubtasks        ticks the named subtasks, nothing else
//   closeFinishedTasks  a task whose every subtask is ticked becomes
//                       `- [x] … — ✅ YYYY-MM-DD <sha>` (its 🔄 / ⛔ suffixes go)
//   dropNowRows         a closed task's rows leave the **Now** table
//
// All three are pure: text in, text out. The lint's own parser (tasks-lint)
// reads the file, so the board has one grammar.
import { allTasks, parseTasksMd } from '../../engine/tooling/tasks-lint/parse.mjs'
import { splitStatusSuffix } from '../../engine/tooling/tasks-lint/status.mjs'

const SUBTASK_BOX_RE = /^( {2}- )\[ \]/
const TASK_HEAD_RE = /^(- )\[ \]( \*\*.+?\*\* · needs: )(.*)$/

function splitLines(text) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  return { eol, lines: text.split(/\r?\n/) }
}

function tasksOf(text) {
  // The lint's parser expects LF; line numbers are the same either way.
  return allTasks(parseTasksMd(text.replace(/\r\n/g, '\n')))
}

/** Ticks each subtask id in `ids`. Returns `{ text, ticked, already, unknown }`. */
export function tickSubtasks(text, ids) {
  const wanted = new Set(ids)
  const { eol, lines } = splitLines(text)
  const ticked = []
  const already = []
  for (const task of tasksOf(text)) {
    for (const sub of task.subtasks) {
      if (!wanted.has(sub.id)) continue
      wanted.delete(sub.id)
      if (sub.checked) {
        already.push(sub.id)
        continue
      }
      lines[sub.line - 1] = lines[sub.line - 1].replace(SUBTASK_BOX_RE, '$1[x]')
      ticked.push(sub.id)
    }
  }
  return { text: lines.join(eol), ticked, already, unknown: [...wanted] }
}

/**
 * Closes every open, uncut task whose subtasks are all ticked: its box is ticked and its
 * status suffixes are replaced by `— ✅ <date> <sha>`. Returns `{ text, closed }`.
 */
export function closeFinishedTasks(text, { date, sha }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`not a date: ${date}`)
  if (!/^[0-9a-f]{6,}$/.test(sha)) throw new Error(`not a short sha: ${sha}`)
  const { eol, lines } = splitLines(text)
  const closed = []
  for (const task of tasksOf(text)) {
    if (task.checked || task.status === 'cut' || task.subtasks.length === 0) continue
    // a subtask marked ✂️ (cut) stops counting, as a cut task does (TASKS.md rule 7)
    if (!task.subtasks.every((s) => s.checked || s.text.includes('✂️'))) continue
    const head = TASK_HEAD_RE.exec(lines[task.line - 1])
    if (!head) continue
    const { needsRaw } = splitStatusSuffix(head[3].trimEnd())
    lines[task.line - 1] = `${head[1]}[x]${head[2]}${needsRaw.trimEnd()} — ✅ ${date} ${sha}`
    closed.push(task.id)
  }
  return { text: lines.join(eol), closed }
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Removes the **Now** table's rows for the task ids in `ids` (`| 7·W1 | 7.1 … |`). */
export function dropNowRows(text, ids) {
  if (ids.length === 0) return text
  const { eol, lines } = splitLines(text)
  const rowRe = new RegExp(`^\\| [^|]*\\| (?:${ids.map(escapeRe).join('|')}) `)
  const out = []
  let inNow = false
  for (const line of lines) {
    if (/^## /.test(line)) inNow = /^## Now\s*$/.test(line)
    if (inNow && rowRe.test(line)) continue
    out.push(line)
  }
  return out.join(eol)
}

/**
 * The whole sync, in order: tick, close, drop **Now** rows.
 * Returns `{ text, ticked, already, unknown, closed }`; `unknown` ids change nothing.
 */
export function syncTasks(text, { date, sha, tick = [] }) {
  const t = tickSubtasks(text, tick)
  if (t.unknown.length > 0) return { ...t, text, ticked: [], closed: [] }
  const c = closeFinishedTasks(t.text, { date, sha })
  return { ...t, text: dropNowRows(c.text, c.closed), closed: c.closed }
}
