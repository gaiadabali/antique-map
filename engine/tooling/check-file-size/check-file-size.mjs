// 2.2.a — the 300-line rule (CONVENTIONS.md §2), ported from KOI's
// `scripts/check-file-size.mjs` (no sibling KOI checkout was found on this
// machine; this is the equivalent, written against the same rule text).
//
// Counts lines in `*.ts`, `*.tsx`, `*.js`, `*.mjs`, `*.css` under the given
// roots and fails on any file over the limit. Generated files, migrations and
// fixtures are excluded — they are not hand-written, so the design rule does
// not apply to them.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/** Every regular file under `root`, recursively (Node's built-in recursive readdir). */
function walk(root) {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath ?? entry.path, entry.name))
}

export const LIMIT = 300
export const EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs', '.css']
export const DEFAULT_ROOTS = ['engine', 'scripts']

/** Generated files nobody hand-edits (PARALLEL-TRACKS.md §2) — never linted for size. */
const GENERATED_BASENAMES = new Set(['payload-types.ts', 'importMap.js', 'next-env.d.ts'])

/** Path segments that mark a subtree as generated, a migration or a fixture. */
const EXCLUDED_SEGMENTS = new Set([
  'node_modules',
  'migrations',
  'fixtures',
  '__fixtures__',
  'dist',
  '.next',
  'coverage',
  'test-results',
  'playwright-report',
])

export function isExcluded(relPath) {
  const segments = relPath.split(/[\\/]/)
  const basename = segments.at(-1)
  if (GENERATED_BASENAMES.has(basename)) return true
  return segments.some((segment) => EXCLUDED_SEGMENTS.has(segment))
}

export function countLines(absPath) {
  const text = readFileSync(absPath, 'utf8')
  if (text === '') return 0
  // A trailing newline is not an extra line.
  const withoutTrailingNewline = text.endsWith('\n') ? text.slice(0, -1) : text
  return withoutTrailingNewline.split('\n').length
}

/**
 * Scans `roots` (relative to `repoRoot`) and returns every file over `LIMIT`
 * lines, as `{ path, lines }` with `path` relative to `repoRoot` (POSIX
 * separators, so output and fixtures are platform-independent).
 */
export function checkFileSize(repoRoot, roots = DEFAULT_ROOTS) {
  const violations = []
  for (const root of roots) {
    const absRoot = join(repoRoot, root)
    let rootStat
    try {
      rootStat = statSync(absRoot)
    } catch {
      continue // a root that does not exist yet (e.g. `scripts/` before 1.1) is not a violation
    }
    if (!rootStat.isDirectory()) continue
    for (const absPath of walk(absRoot)) {
      const relPath = relative(repoRoot, absPath)
      if (!EXTENSIONS.some((ext) => absPath.endsWith(ext))) continue
      if (isExcluded(relPath)) continue
      const lines = countLines(absPath)
      if (lines > LIMIT) {
        violations.push({ path: relPath.split(sep).join('/'), lines })
      }
    }
  }
  return violations.sort((a, b) => a.path.localeCompare(b.path))
}
