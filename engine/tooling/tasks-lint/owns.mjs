// Path-overlap detection for `**Owns**` lists (TASKS.md 2.2.f: "no two tasks
// in one wave with overlapping Owns"). A minimal glob-overlap check, segment
// by segment: two patterns overlap when some concrete path could match both
// — `engine/apps/*/src/messages/keys.ts` overlaps
// `engine/apps/gallery/src/messages/keys.ts` (the `*` stands for `gallery`)
// but not `engine/apps/gallery/PRODUCT.md` (a different file one directory
// up), which a cruder "stop at the first wildcard" prefix check would have
// missed as a false positive.

/** `a/{b,c}/d` → `['a/b/d', 'a/c/d']` (one level of `{…}`; TASKS.md never nests them). */
function expandBraces(pattern) {
  const match = /\{([^}]+)\}/.exec(pattern)
  if (!match) return [pattern]
  const [whole, inner] = match
  return inner.split(',').flatMap((alt) => expandBraces(pattern.replace(whole, alt)))
}

/** A glob segment (`*`, `lighthouserc*.json`) as a regex — `*` means "zero or more characters", nothing else is special. */
function segmentToRegExp(segment) {
  const escaped = segment.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`)
}

/** One wildcard segment (`*`, `*.ts`, `lighthouserc*.json`) matches a concrete segment only when its non-`*` parts actually appear in it; `**` is handled by the caller. */
function segmentsCompatible(a, b) {
  if (a === b) return true
  const aWild = a.includes('*')
  const bWild = b.includes('*')
  if (aWild && !bWild) return segmentToRegExp(a).test(b)
  if (bWild && !aWild) return segmentToRegExp(b).test(a)
  if (aWild && bWild) return true // both wildcarded: no single-`*` case in this repo needs more precision
  return false
}

/** Do two (already brace-expanded, single-glob) patterns share at least one concrete path? */
function patternsOverlap(patternA, patternB) {
  const segA = patternA.split('/')
  const segB = patternB.split('/')
  let i = 0
  let j = 0
  while (i < segA.length && j < segB.length) {
    if (segA[i] === '**' || segB[j] === '**') return true // absorbs everything remaining on both sides
    if (!segmentsCompatible(segA[i], segB[j])) return false
    i++
    j++
  }
  return i === segA.length && j === segB.length
}

/** Every concrete pattern one `**Owns**` entry expands to (brace expansion only — the glob itself is compared structurally, not pre-truncated). */
export function ownsPrefixes(pattern) {
  return expandBraces(pattern)
}

/** True when any expansion of `a` and any expansion of `b` can match the same concrete path. */
export function ownsOverlap(a, b) {
  const patternsA = expandBraces(a)
  const patternsB = expandBraces(b)
  return patternsA.some((pa) => patternsB.some((pb) => patternsOverlap(pa, pb)))
}

/** Every `{ taskA, taskB, pathA, pathB }` conflict between two tasks' Owns lists. */
export function findOwnsConflicts(taskA, taskB) {
  const conflicts = []
  for (const pathA of taskA.owns) {
    for (const pathB of taskB.owns) {
      if (ownsOverlap(pathA, pathB)) {
        conflicts.push({ taskA: taskA.id, taskB: taskB.id, pathA, pathB })
      }
    }
  }
  return conflicts
}
