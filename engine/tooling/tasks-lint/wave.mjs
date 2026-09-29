// `pnpm tasks:lint --phase <n> --wave <k>` (TASKS.md 2.2.f): whether this
// specific wave is actually ready to dispatch — its phase's needs are ✅ and
// every task in the wave has its dependencies ticked — not the whole
// document's structural health (that's `lintFullFile`).
import { expandNeedsToken } from './needs.mjs'

function isPhaseDone(phase) {
  return phase.tasks.length > 0 && phase.tasks.every((t) => t.checked)
}

function idChecked(tasks, id) {
  const [phaseNum, taskNum, letter] = id.split('.')
  const task = tasks.find((t) => t.id === `${phaseNum}.${taskNum}`)
  if (!task) return { exists: false, checked: false }
  if (!letter) return { exists: true, checked: task.checked }
  const subtask = task.subtasks.find((s) => s.id === id)
  return { exists: Boolean(subtask), checked: Boolean(subtask?.checked) }
}

/**
 * `{ ready, blockers }` for dispatching phase `phaseNumber`'s wave `waveLabel`
 * (e.g. `"W2"`). A blocker is a human-readable reason it is not ready yet.
 */
export function checkWaveReadiness(model, tasks, phaseNumber, waveLabel) {
  const blockers = []
  const phase = model.phases.find((p) => p.number === phaseNumber)
  if (!phase) return { ready: false, blockers: [`phase ${phaseNumber} does not exist`] }

  for (const token of phase.needs) {
    if (token === '—') continue
    const neededPhase = model.phases.find((p) => p.number === Number(token))
    if (!neededPhase) {
      blockers.push(`phase ${phaseNumber} needs phase ${token}, which does not exist`)
      continue
    }
    if (!isPhaseDone(neededPhase)) {
      blockers.push(`phase ${phaseNumber} needs phase ${token}, not ✅ yet`)
    }
  }

  const waveTasks = phase.tasks.filter((t) => t.wave === waveLabel)
  if (waveTasks.length === 0) {
    blockers.push(`phase ${phaseNumber} has no task in wave ${waveLabel}`)
    return { ready: false, blockers }
  }

  for (const task of waveTasks) {
    for (const token of task.needs) {
      const result = expandNeedsToken(token)
      if (result.error) continue // reported by lintFullFile, not this mode
      if (result.phase !== undefined) {
        const neededPhase = model.phases.find((p) => p.number === result.phase)
        if (neededPhase && !isPhaseDone(neededPhase)) {
          blockers.push(`${task.id} needs phase ${result.phase}, not ✅ yet`)
        }
        continue
      }
      for (const id of result.ids ?? []) {
        const { exists, checked } = idChecked(tasks, id)
        if (!exists) continue // reported by lintFullFile
        if (!checked) blockers.push(`${task.id} needs ${id}, not ticked yet`)
      }
    }
  }

  return { ready: blockers.length === 0, blockers }
}
