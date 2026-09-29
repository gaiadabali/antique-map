// 2.2.f — every structural rule TASKS.md's own entry names, over the parsed
// model (`parse.mjs`). Each rule returns `Finding[]`; `lintFullFile` runs all
// of them. `--phase/--wave` mode (`wave.mjs`) reuses `allTasks` and the needs
// resolver but asks a narrower question.
import { expandNeedsToken } from './needs.mjs'
import { findOwnsConflicts } from './owns.mjs'
import { findUncoveredRequirements } from './requirements.mjs'

function finding(rule, message, line) {
  return { rule, message, line }
}

function taskById(tasks, id) {
  return tasks.find((t) => t.id === id)
}

/** Every id (task or subtask) declared, with the line it first appears on — flags a repeat. */
export function checkUniqueIds(model, tasks) {
  const findings = []
  const seen = new Map()
  const record = (id, line) => {
    if (seen.has(id))
      findings.push(
        finding('unique-ids', `"${id}" is declared twice (first at line ${seen.get(id)})`, line),
      )
    else seen.set(id, line)
  }
  for (const task of tasks) {
    record(task.id, task.line)
    for (const subtask of task.subtasks) record(subtask.id, subtask.line)
  }
  return findings
}

/**
 * Every task's `needs:` token must parse (`needs.mjs`) and, if it names an
 * id, that id must exist. A phase heading's own `needs` is a different, plain
 * grammar — bare phase numbers or `—` — checked by `checkPhaseNeedsMatchTasks`
 * instead (which also confirms every declared phase number exists).
 */
export function checkNeedsResolvable(model, tasks) {
  const findings = []
  const ids = new Set(tasks.flatMap((t) => [t.id, ...t.subtasks.map((s) => s.id)]))
  const phaseNumbers = new Set(model.phases.map((p) => p.number))
  for (const task of tasks) {
    for (const token of task.needs) {
      const result = expandNeedsToken(token)
      if (result.error) {
        findings.push(
          finding('needs-resolvable', `${task.id} needs "${token}" ${result.error}`, task.line),
        )
        continue
      }
      if (result.phase !== undefined && !phaseNumbers.has(result.phase)) {
        findings.push(
          finding(
            'needs-resolvable',
            `${task.id} needs "phase ${result.phase}", which does not exist`,
            task.line,
          ),
        )
      }
      for (const id of result.ids ?? []) {
        if (!ids.has(id)) {
          findings.push(
            finding(
              'needs-resolvable',
              `${task.id} needs "${id}", which does not exist`,
              task.line,
            ),
          )
        }
      }
    }
  }
  return findings
}

/** Resolves a task's needs tokens to task ids, dropping phase-level and unresolvable ones. */
function resolvedTaskIds(task) {
  return task.needs.flatMap((token) => {
    const r = expandNeedsToken(token)
    return r.ids ?? []
  })
}

/**
 * Every phase's declared `needs`, transitively (phase P reaches every phase
 * reachable by following declared `needs` edges) — a phase heading need only
 * name its *direct* dependency; a task may still cite a specific deliverable
 * several phases further back (e.g. a contract task in phase 1) precisely
 * because phase 1 is already an ancestor of everything through the chain.
 */
function transitiveClosures(phases) {
  const declaredOf = new Map(
    phases.map((p) => [p.number, new Set(p.needs.filter((n) => n !== '—').map(Number))]),
  )
  const closure = new Map()
  const resolve = (n, seen = new Set()) => {
    if (closure.has(n)) return closure.get(n)
    if (seen.has(n)) return new Set() // a cycle — checkPhaseNeedsMatchTasks's earlier-numbered check reports it
    seen.add(n)
    const direct = declaredOf.get(n) ?? new Set()
    const all = new Set(direct)
    for (const d of direct) for (const anc of resolve(d, seen)) all.add(anc)
    closure.set(n, all)
    return all
  }
  for (const p of phases) resolve(p.number)
  return closure
}

/** A phase heading's own `needs` must be earlier-numbered, and every phase its tasks need from outside it must be reachable through the declared chain. */
export function checkPhaseNeedsMatchTasks(model, tasks) {
  const findings = []
  const closures = transitiveClosures(model.phases)
  const phaseNumbers = new Set(model.phases.map((p) => p.number))
  for (const phase of model.phases) {
    const declared = new Set(phase.needs.filter((n) => n !== '—').map((n) => Number(n)))
    for (const n of declared) {
      if (!phaseNumbers.has(n)) {
        findings.push(
          finding(
            'phase-needs',
            `phase ${phase.number} declares needs ${n}, which does not exist`,
            phase.line,
          ),
        )
      } else if (!(n < phase.number)) {
        findings.push(
          finding(
            'phase-needs',
            `phase ${phase.number} declares needs ${n}, not earlier-numbered`,
            phase.line,
          ),
        )
      }
    }
    const reachable = closures.get(phase.number) ?? new Set()
    const implied = new Set()
    for (const task of phase.tasks) {
      for (const token of task.needs) {
        const r = expandNeedsToken(token)
        if (r.phase !== undefined) implied.add(r.phase)
        for (const id of r.ids ?? []) {
          const target = taskById(tasks, id) ?? taskById(tasks, id.split('.').slice(0, 2).join('.'))
          if (target && target.phaseNumber !== phase.number) implied.add(target.phaseNumber)
        }
      }
    }
    const unreachable = [...implied].filter((n) => !reachable.has(n))
    for (const n of unreachable) {
      findings.push(
        finding(
          'phase-needs',
          `phase ${phase.number}'s tasks need phase ${n}, not reachable through the phase heading's declared needs chain`,
          phase.line,
        ),
      )
    }
  }
  return findings
}

/** A task never shares a wave with a task it depends on (same phase, same wave literal). */
export function checkNoSameWaveDependency(model, tasks) {
  const findings = []
  for (const task of tasks) {
    if (!task.wave) continue
    for (const id of resolvedTaskIds(task)) {
      const depTaskId = id.split('.').slice(0, 2).join('.')
      const dep = taskById(tasks, depTaskId)
      if (dep && dep.phaseNumber === task.phaseNumber && dep.wave === task.wave) {
        findings.push(
          finding(
            'no-same-wave-dependency',
            `${task.id} (wave ${task.wave}) depends on ${dep.id}, in the same wave`,
            task.line,
          ),
        )
      }
    }
  }
  return findings
}

/** No two tasks in one (phase, wave) may have an overlapping Owns entry. */
export function checkOwnsOverlap(model) {
  const findings = []
  for (const phase of model.phases) {
    const byWave = new Map()
    for (const task of phase.tasks) {
      if (!task.wave) continue
      if (!byWave.has(task.wave)) byWave.set(task.wave, [])
      byWave.get(task.wave).push(task)
    }
    for (const tasksInWave of byWave.values()) {
      for (let i = 0; i < tasksInWave.length; i++) {
        for (let j = i + 1; j < tasksInWave.length; j++) {
          for (const c of findOwnsConflicts(tasksInWave[i], tasksInWave[j])) {
            findings.push(
              finding(
                'owns-overlap',
                `${c.taskA} and ${c.taskB} share wave ${tasksInWave[i].wave}: "${c.pathA}" overlaps "${c.pathB}"`,
                tasksInWave[i].line,
              ),
            )
          }
        }
      }
    }
  }
  return findings
}

/** At most eight tasks and three waves per phase. */
export function checkPhaseLimits(model) {
  const findings = []
  for (const phase of model.phases) {
    if (phase.tasks.length > 8) {
      findings.push(
        finding(
          'phase-limits',
          `phase ${phase.number} has ${phase.tasks.length} tasks, more than 8`,
          phase.line,
        ),
      )
    }
    const waves = new Set(phase.tasks.map((t) => t.wave).filter(Boolean))
    if (waves.size > 3) {
      findings.push(
        finding(
          'phase-limits',
          `phase ${phase.number} has ${waves.size} waves, more than 3`,
          phase.line,
        ),
      )
    }
  }
  return findings
}

/** Every task's last subtask must be its Check. */
export function checkEndsInCheck(model, tasks) {
  const findings = []
  for (const task of tasks) {
    const last = task.subtasks.at(-1)
    if (!last || !last.isCheck) {
      findings.push(
        finding('ends-in-check', `${task.id} does not end in a **Check:** subtask`, task.line),
      )
    }
  }
  return findings
}

/** Every requirement criterion in requirements.md is claimed by some task's `_Requirements:` tag. */
export function checkRequirementsCovered(repoRoot, tasks) {
  const { uncovered, available } = findUncoveredRequirements(repoRoot, tasks)
  if (!available) return []
  return uncovered.map((id) =>
    finding('requirements-covered', `requirement ${id} is not claimed by any task`, null),
  )
}

export const ALL_RULES = [
  checkUniqueIds,
  checkNeedsResolvable,
  checkPhaseNeedsMatchTasks,
  checkNoSameWaveDependency,
  checkOwnsOverlap,
  checkPhaseLimits,
  checkEndsInCheck,
]
