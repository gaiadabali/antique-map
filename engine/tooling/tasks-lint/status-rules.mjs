// 3.3.d — the rules over a task line's status suffixes (`status.mjs`), as the
// board's "How to update this file" states them: ✅ only on a ticked task and
// every ticked task ✅ (rule 4); 🔄 names the task's own phase and a wave it
// sits in (rule 2); ⛔ and ✂️ give a reason (rules 6, 7); and a ✂️ task, which
// stops counting, is no longer something an open task can wait on.
import { expandNeedsToken } from './needs.mjs'
import { isCut } from './status.mjs'

function finding(rule, message, line) {
  return { rule, message, line }
}

/** Which suffixes may not share a line: a done or cut task is neither in flight nor blocked. */
const EXCLUSIVE = [
  ['done', 'doing'],
  ['done', 'blocked'],
  ['done', 'cut'],
  ['cut', 'doing'],
  ['cut', 'blocked'],
]
const MARK = { done: '✅', doing: '🔄', blocked: '⛔', cut: '✂️' }

/** Every task line's suffixes parse, agree with its checkbox, and agree with each other. */
export function checkTaskStatus(model, tasks) {
  const findings = []
  const report = (task, message) =>
    findings.push(finding('task-status', `${task.id} ${message}`, task.line))
  for (const task of tasks) {
    const kinds = task.statuses.map((s) => s.kind)
    for (const status of task.statuses) {
      if (status.malformed)
        report(task, `has a status suffix that does not parse: ${status.malformed}`)
    }
    for (const kind of new Set(kinds)) {
      if (kind && kinds.filter((k) => k === kind).length > 1) {
        report(task, `carries ${MARK[kind]} twice`)
      }
    }
    for (const [a, b] of EXCLUSIVE) {
      if (kinds.includes(a) && kinds.includes(b)) {
        report(task, `is marked both ${MARK[a]} and ${MARK[b]}`)
      }
    }
    const done = kinds.includes('done')
    if (task.checked && !done) report(task, 'is ticked [x] but has no "— ✅ YYYY-MM-DD <sha>"')
    if (!task.checked && done) report(task, 'is marked ✅ but its box is not ticked')
    if (task.checked && isCut(task)) report(task, 'is ticked [x] and ✂️ cut')
    const open = task.subtasks.filter((s) => !s.checked).map((s) => s.id)
    if (task.checked && open.length > 0) {
      report(task, `is ticked [x] but its subtask(s) ${open.join(', ')} are not`)
    }

    const doing = task.statuses.find((s) => s.kind === 'doing' && !s.malformed)
    if (doing) {
      if (doing.phase !== task.phaseNumber) {
        report(
          task,
          `is 🔄 ${doing.phase}·${doing.wave}, but it is a phase ${task.phaseNumber} task`,
        )
      }
      const waves = task.wave ? task.wave.split('·') : []
      if (waves.length > 0 && !waves.includes(doing.wave)) {
        report(task, `is 🔄 in ${doing.wave}, but its **Wave** is ${task.wave}`)
      }
    }
  }
  return findings
}

/**
 * An open task never waits on an unticked ✂️ task (or unticked subtask of one): a cut task
 * will never be ✅, so the need is re-pointed at whatever replaced it. A task already ✅, or itself cut,
 * is history and is left alone.
 */
export function checkNeedsCut(model, tasks) {
  const findings = []
  const byId = new Map(tasks.map((t) => [t.id, t]))
  for (const task of tasks) {
    if (task.checked || isCut(task)) continue
    for (const token of task.needs) {
      for (const id of expandNeedsToken(token).ids ?? []) {
        const target = byId.get(id.split('.').slice(0, 2).join('.'))
        if (!target || !isCut(target)) continue
        // A subtask ticked before the cut was delivered; the need stands on it.
        const subtask = target.subtasks.find((s) => s.id === id)
        if (!(subtask ?? target).checked) {
          findings.push(
            finding(
              'needs-cut',
              `${task.id} needs ${id}, but ${target.id} is ✂️ cut: it will never be ✅`,
              task.line,
            ),
          )
        }
      }
    }
  }
  return findings
}
