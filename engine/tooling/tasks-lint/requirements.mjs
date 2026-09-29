// Cross-checks TASKS.md's `_Requirements: N.M, …_` tags against
// `.claude/specs/indies-platform/requirements.md`'s own numbered criteria, so
// "every requirement covered" (2.2.f) is a real diff, not an assertion.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const REQUIREMENTS_MD = ['.claude', 'specs', 'indies-platform', 'requirements.md']
const REQUIREMENT_HEADING_RE = /^### Requirement (\d+)/
const CRITERION_RE = /^(\d+)\.\s/

/** `{ ids, available }` — every `N.M` criterion id `requirements.md` declares, in file order. */
export function discoverRequirementIds(repoRoot) {
  const path = join(repoRoot, ...REQUIREMENTS_MD)
  if (!existsSync(path)) return { ids: [], available: false }
  const ids = []
  let currentRequirement = null
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const heading = REQUIREMENT_HEADING_RE.exec(line)
    if (heading) {
      currentRequirement = Number(heading[1])
      continue
    }
    if (currentRequirement === null) continue
    const criterion = CRITERION_RE.exec(line)
    if (criterion) ids.push(`${currentRequirement}.${criterion[1]}`)
  }
  return { ids, available: true }
}

/** Every `N.M` id referenced anywhere in the parsed model's tasks' `_Requirements:` tags. */
export function referencedRequirementIds(tasks) {
  const ids = new Set()
  for (const task of tasks) {
    for (const id of task.requirements) ids.add(id)
  }
  return ids
}

/** Requirement ids declared in `requirements.md` that no task claims. */
export function findUncoveredRequirements(repoRoot, tasks) {
  const { ids, available } = discoverRequirementIds(repoRoot)
  if (!available) return { uncovered: [], available: false }
  const referenced = referencedRequirementIds(tasks)
  return { uncovered: ids.filter((id) => !referenced.has(id)), available: true }
}
