// 2.2.g — `pnpm check:generated`: regenerate → diff → fail, generic over a
// pluggable list of generators (ARCHITECTURE.md §2, PARALLEL-TRACKS.md §2).
// No Payload exists yet (3.2), so `generators.mjs`'s real registry cannot run
// today — this module is the mechanism, unit-proven against a fixture
// generator; `generators.mjs` names precisely what 3.2 must plug in.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A `Generator` is `{ name, committedPath, regenerate(repoRoot) }`:
 * `committedPath` is the file nobody hand-edits (`payload-types.ts`,
 * `importMap.js`, the migration snapshot); `regenerate` returns what running
 * the real generator today would produce, or throws/returns `null` when its
 * prerequisite does not exist yet — the caller reports that as a gap, not a
 * failure.
 */

function readCommitted(repoRoot, committedPath) {
  try {
    return readFileSync(join(repoRoot, committedPath), 'utf8')
  } catch {
    return null
  }
}

/** Runs every generator in `generators` and reports violations and gaps. */
export async function runConfigDrift(repoRoot, generators) {
  const violations = []
  const degraded = []
  for (const generator of generators) {
    let fresh
    try {
      fresh = await generator.regenerate(repoRoot)
    } catch (error) {
      degraded.push(`${generator.name}: nothing to check yet — ${error.message}`)
      continue
    }
    if (fresh === null) {
      degraded.push(
        `${generator.name}: nothing to check yet — its generator is not wired up (see generators.mjs)`,
      )
      continue
    }
    const committed = readCommitted(repoRoot, generator.committedPath)
    if (committed === null) {
      degraded.push(
        `${generator.name}: nothing to check yet — ${generator.committedPath} does not exist`,
      )
      continue
    }
    if (committed !== fresh) {
      violations.push({ name: generator.name, path: generator.committedPath })
    }
  }
  return { violations, degraded }
}
