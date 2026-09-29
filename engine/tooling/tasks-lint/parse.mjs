// 2.2.f — turns `TASKS.md` into a structured model: phases, each with tasks,
// each with subtasks. A best-effort line grammar over one specific document,
// not a general Markdown parser — see CONVENTIONS.md's own idiom of small,
// single-purpose files.

const PHASE_RE = /^## Phase (\d+) — (.+?) · ([^·]+) · needs (.+?) · ~.+$/
const DONE_SUFFIX_RE = / — ✅ (\d{4}-\d{2}-\d{2}) ([0-9a-f]{6,})\s*$/
const TASK_RE = /^- \[( |x)\] \*\*(\d+)\.(\d+) (.+?)\*\* · needs: (.+)$/
const SUBTASK_RE = /^ {2}- \[( |x)\] (\d+)\.(\d+)\.([a-z]) (.+)$/
const WAVE_RE = /\*\*Wave\*\*\s+(W\d(?:\s*·\s*W\d)*)/
const OWNS_RE = /^\s*- \*\*Owns\*\*\s+(.+)$/
const REQUIREMENTS_RE = /^\s*-?\s*_Requirements:\s*(.+)_\s*$/

/** Splits a comma-separated needs/owns list, trimming each entry. */
function splitList(raw) {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Every `` `path` `` token on an **Owns** line, ignoring any `ARC-P:`/`ARC-D:`-style sub-lane prefix before it. */
function parseOwnsLine(raw) {
  return [...raw.matchAll(/`([^`]+)`/g)].map((m) => m[1])
}

export function parseTasksMd(text) {
  const lines = text.split('\n')
  const phases = []
  let phase = null
  let task = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const phaseMatch = PHASE_RE.exec(line)
    if (phaseMatch) {
      const [, number, title, stage, needsRaw] = phaseMatch
      phase = {
        number: Number(number),
        title: title.trim(),
        stage: stage.trim(),
        needsRaw: needsRaw.trim(),
        needs: needsRaw.trim() === '—' ? [] : splitList(needsRaw),
        line: i + 1,
        tasks: [],
      }
      phases.push(phase)
      task = null
      continue
    }

    const taskMatch = TASK_RE.exec(line)
    if (taskMatch) {
      const [, checked, phaseNum, taskNum, titleAndRest, needsAndRest] = taskMatch
      const doneMatch = DONE_SUFFIX_RE.exec(needsAndRest)
      const needsRaw = doneMatch ? needsAndRest.slice(0, doneMatch.index) : needsAndRest
      task = {
        id: `${phaseNum}.${taskNum}`,
        phaseNumber: Number(phaseNum),
        title: titleAndRest.trim(),
        checked: checked === 'x',
        doneDate: doneMatch ? doneMatch[1] : null,
        doneSha: doneMatch ? doneMatch[2] : null,
        needsRaw: needsRaw.trim(),
        needs: needsRaw.trim() === '—' ? [] : splitList(needsRaw),
        wave: null,
        owns: [],
        requirements: [],
        line: i + 1,
        subtasks: [],
      }
      if (phase) phase.tasks.push(task)
      continue
    }

    const subtaskMatch = SUBTASK_RE.exec(line)
    if (subtaskMatch && task) {
      const [, checked, phaseNum, taskNum, letter, text] = subtaskMatch
      task.subtasks.push({
        id: `${phaseNum}.${taskNum}.${letter}`,
        letter,
        checked: checked === 'x',
        text: text.trim(),
        isCheck: /^\*\*Check:?\*\*/.test(text.trim()),
        line: i + 1,
      })
      continue
    }

    if (task && task.subtasks.length === 0) {
      // Metadata lines between a task's header and its first subtask.
      const waveMatch = WAVE_RE.exec(line)
      if (waveMatch) task.wave = waveMatch[1].replace(/\s+/g, '')
      const ownsMatch = OWNS_RE.exec(line)
      if (ownsMatch) task.owns.push(...parseOwnsLine(ownsMatch[1]))
      const reqMatch = REQUIREMENTS_RE.exec(line)
      if (reqMatch) task.requirements.push(...splitList(reqMatch[1]))
    }
  }

  return { phases }
}

/** Every task across every phase, flattened, in document order. */
export function allTasks(model) {
  return model.phases.flatMap((p) => p.tasks)
}
