// 2.2.g / 3.5.b — `pnpm check:generated`: regenerate → diff → fail, generic over a
// pluggable list of generators (ARCHITECTURE.md §2, PARALLEL-TRACKS.md §2). This
// module is the mechanism, unit-proven against fixture generators;
// `generators.mjs` is the real registry, running the CMS package's own scripts.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A generator is one of:
 *
 *   { name, committedPath, regenerate(repoRoot), expected?(repoRoot), required? }
 *     `regenerate` returns what running the real generator today produces (or
 *     `null`: not wired up). It is compared with `expected()` when given — the
 *     BRAND-unset output, for a per-brand run — else with the file at
 *     `committedPath`, which nobody hand-edits (`referenceName` says which, in
 *     the message). A `required` generator's missing reference is drift;
 *     otherwise it is a gap.
 *
 *   { name, committedPath, check(repoRoot) } → { ok, detail? }
 *     a generator that judges for itself (`schema:check`'s exit code).
 *
 * Throwing `NothingToCheckYet` reports a gap (a prerequisite a later task
 * adds); throwing anything else is a violation — a generator that cannot run
 * is never a pass.
 */
export class NothingToCheckYet extends Error {}

function readCommitted(repoRoot, committedPath) {
  try {
    return readFileSync(join(repoRoot, committedPath), 'utf8')
  } catch {
    return null
  }
}

const clip = (line) => JSON.stringify(line.length > 100 ? `${line.slice(0, 100)}…` : line)

/** Where two texts first differ, as one line a person can act on. */
export function firstDifference(reference, fresh, referenceName = 'committed') {
  const a = reference.split('\n')
  const b = fresh.split('\n')
  const index = a.findIndex((line, i) => line !== b[i])
  const at = index === -1 ? a.length : index
  return `first difference at line ${at + 1}: ${referenceName} ${clip(a[at] ?? '<end of file>')}, regenerated ${clip(b[at] ?? '<end of file>')}`
}

async function judge(repoRoot, generator) {
  const { name, committedPath } = generator
  try {
    if (generator.check) {
      const { ok, detail } = await generator.check(repoRoot)
      return ok ? {} : { violation: { name, path: committedPath, detail } }
    }
    const fresh = await generator.regenerate(repoRoot)
    if (fresh === null) {
      return {
        degraded: `${name}: nothing to check yet — its generator is not wired up (see generators.mjs)`,
      }
    }
    const reference = generator.expected
      ? await generator.expected(repoRoot)
      : readCommitted(repoRoot, committedPath)
    if (reference === null) {
      if (generator.required) {
        return { violation: { name, path: committedPath, detail: 'the file is not committed' } }
      }
      return { degraded: `${name}: nothing to check yet — ${committedPath} does not exist` }
    }
    if (reference === fresh) return {}
    const referenceName =
      generator.referenceName ?? (generator.expected ? 'with BRAND unset' : 'committed')
    return {
      violation: {
        name,
        path: committedPath,
        detail: firstDifference(reference, fresh, referenceName),
      },
    }
  } catch (error) {
    if (error instanceof NothingToCheckYet) {
      return { degraded: `${name}: nothing to check yet — ${error.message}` }
    }
    const detail = `the generator failed: ${error instanceof Error ? error.message : String(error)}`
    return { violation: { name, path: committedPath, detail } }
  }
}

/**
 * Runs every generator in `generators` — concurrently; each bounds its own
 * processes — and reports violations and gaps in the generators' order.
 */
export async function runConfigDrift(repoRoot, generators) {
  const results = await Promise.all(generators.map((generator) => judge(repoRoot, generator)))
  const violations = results.filter((r) => r.violation).map((r) => r.violation)
  const degraded = results.filter((r) => r.degraded).map((r) => r.degraded)
  return { violations, degraded, ran: results.length - degraded.length }
}
