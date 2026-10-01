// The progress table at the top of TASKS.md: a summary of the checkboxes, never
// edited by hand. Counted per "## Phase N" section; the backlog and the log are not.
//
// A task line containing ⛔ counts as blocked; one containing ✂️ (cut) is not
// counted at all, and neither are its subtasks.

export const START = '<!-- progress:start -->'
export const END = '<!-- progress:end -->'

const PHASE_RE = /^## Phase ([0-9]+) — (.+?) · ([^·]+?) · needs ([^·]+?) · (~[^·]+?)\s*$/
const TASK_RE = /^- \[( |x)\] \*\*\d+\.\d+ /
const SUBTASK_RE = /^\s+- \[( |x)\] \d+\.\d+\.[a-z]+ /

/** Counts every phase's tasks and subtasks. */
export function countPhases(text) {
  const phases = []
  let current = null
  let cut = false
  for (const line of text.split(/\r?\n/)) {
    const heading = PHASE_RE.exec(line)
    if (heading) {
      current = {
        id: heading[1],
        title: heading[2].trim(),
        stage: heading[3].trim(),
        needs: heading[4].trim(),
        tasks: 0,
        tasksDone: 0,
        doing: 0,
        blocked: 0,
        subs: 0,
        subsDone: 0,
        owner: 0,
      }
      phases.push(current)
      continue
    }
    if (/^## /.test(line)) {
      current = null
      continue
    }
    if (!current) continue
    const task = TASK_RE.exec(line)
    if (task) {
      cut = line.includes('✂️')
      if (cut) continue
      current.tasks += 1
      if (task[1] === 'x') current.tasksDone += 1
      else if (line.includes('⛔')) current.blocked += 1
      else if (line.includes('🔄')) current.doing += 1
      continue
    }
    const sub = SUBTASK_RE.exec(line)
    if (sub && !cut) {
      current.subs += 1
      if (sub[1] === 'x') current.subsDone += 1
      else if (line.includes('👤')) current.owner += 1
    }
  }
  return phases
}

function bar(done, total) {
  if (total === 0) return '`░░░░░░░░░░`   0%'
  const pct = Math.round((done / total) * 100)
  const filled = Math.round(pct / 10)
  return '`' + '█'.repeat(filled) + '░'.repeat(10 - filled) + '` ' + String(pct).padStart(3) + '%'
}

function status(p) {
  if (p.tasks > 0 && p.tasksDone === p.tasks) return '✅ done'
  if (p.blocked > 0 && p.doing === 0) return '⛔ blocked'
  if (p.doing > 0 || p.subsDone > 0 || p.tasksDone > 0) return '🔄 in progress'
  return '· not started'
}

/** The table's Markdown and the board's totals. */
export function buildTable(text) {
  const phases = countPhases(text)
  const total = phases.reduce(
    (acc, p) => ({
      tasks: acc.tasks + p.tasks,
      tasksDone: acc.tasksDone + p.tasksDone,
      subs: acc.subs + p.subs,
      subsDone: acc.subsDone + p.subsDone,
      owner: acc.owner + p.owner,
    }),
    { tasks: 0, tasksDone: 0, subs: 0, subsDone: 0, owner: 0 },
  )
  const rows = [
    '| Phase | Stage | Needs | Status | Tasks | Subtasks | 👤 open | Progress |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...phases.map(
      (p) =>
        `| **${p.id}** ${p.title} | ${p.stage} | ${p.needs} | ${status(p)} | ${p.tasksDone}/${p.tasks} | ${p.subsDone}/${p.subs} | ${p.owner} | ${bar(p.subsDone, p.subs)} |`,
    ),
    `| **All** | ${phases.length} phases | | | **${total.tasksDone}/${total.tasks}** | **${total.subsDone}/${total.subs}** | **${total.owner}** | ${bar(total.subsDone, total.subs)} |`,
  ]
  return { table: rows.join('\n'), total }
}

/** `text` with the table between the markers replaced; throws when the markers are missing. */
export function replaceTable(text, table) {
  const s = text.indexOf(START)
  const e = text.indexOf(END)
  if (s === -1 || e === -1 || e < s) {
    throw new Error(`TASKS.md is missing the ${START} / ${END} markers`)
  }
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const body = table.split('\n').join(eol)
  return text.slice(0, s + START.length) + eol + body + eol + text.slice(e)
}
