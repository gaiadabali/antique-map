// `pnpm tasks:lint --phase <n> --wave <k>` (TASKS.md 2.2.f): whether this
// specific wave is actually ready to dispatch — its phase's needs are ✅ and
// every task in the wave has its dependencies ticked, and no two of its tasks
// own one path (as the full lint's owns-overlap rule) — not the whole
// document's structural health (that's `lintFullFile`).
//
// The status suffixes (3.3.d, `status.mjs`) read as the board's rules say:
// - 🔄 is in flight, not ✅: a task waiting on a 🔄 one is not ready, and a 🔄
//   task in the wave is already dispatched, so it asks nothing more of it.
// - ⛔ holds its own task: a ⛔ task in the wave is a blocker, named with its
//   reason (the orchestrator "moves on to the next unblocked task", rule 6).
// - ✂️ stops counting (rule 7): a cut task is not dispatched and does not keep
//   its wave or its phase from being done; a task that still needs an unticked
//   piece of a cut one is blocked until the need is re-pointed — it will never
//   be ✅. (A subtask ticked before the cut was delivered and still counts.)
import { expandNeedsToken } from './needs.mjs'
import { findWaveConflicts, overlapMessage } from './owns.mjs'
import { isCut, statusEntry } from './status.mjs'

/** A phase is done when every task that still counts is ticked (and at least one does). */
function isPhaseDone(phase) {
  const counted = phase.tasks.filter((t) => !isCut(t))
  return counted.length > 0 && counted.every((t) => t.checked)
}

function idState(tasks, id) {
  const [phaseNum, taskNum, letter] = id.split('.')
  const task = tasks.find((t) => t.id === `${phaseNum}.${taskNum}`)
  if (!task) return { exists: false, checked: false, task: null }
  if (!letter) return { exists: true, checked: task.checked, task }
  const subtask = task.subtasks.find((s) => s.id === id)
  return { exists: Boolean(subtask), checked: Boolean(subtask?.checked), task }
}

/** Why an unticked need is unticked, from its task's suffixes. */
function whyNotTicked(task) {
  const blocked = statusEntry(task, 'blocked')
  if (blocked) return ` (⛔ ${blocked.reason ?? blocked.raw})`
  const doing = statusEntry(task, 'doing')
  if (doing) return ' (🔄 in flight)'
  return ''
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

  const waveTasks = phase.tasks.filter((t) => t.wave === waveLabel && !isCut(t))
  if (waveTasks.length === 0) {
    blockers.push(`phase ${phaseNumber} has no task in wave ${waveLabel} that is not ✂️ cut`)
    return { ready: false, blockers }
  }

  // Two tasks of the wave owning one path is the collision a wave exists to prevent: refused here
  // as the full lint refuses it (PARALLEL-TRACKS.md §5, gate F4).
  for (const conflict of findWaveConflicts(waveTasks)) {
    blockers.push(`Owns overlap: ${overlapMessage(conflict)}`)
  }

  for (const task of waveTasks) {
    const blocked = statusEntry(task, 'blocked')
    if (blocked && !task.checked) {
      blockers.push(`${task.id} is ⛔ blocked: ${blocked.reason ?? blocked.raw}`)
    }
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
        const { exists, checked, task: needed } = idState(tasks, id)
        if (!exists || checked) continue // a missing id is reported by lintFullFile
        if (isCut(needed)) {
          blockers.push(`${task.id} needs ${id}, which is ✂️ cut: re-point the need`)
        } else {
          blockers.push(`${task.id} needs ${id}, not ticked yet${whyNotTicked(needed)}`)
        }
      }
    }
  }

  return { ready: blockers.length === 0, blockers }
}
