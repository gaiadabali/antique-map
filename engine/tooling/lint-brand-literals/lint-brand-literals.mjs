// 2.2.b — no brand literal under `engine/` (CONVENTIONS.md §1).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { collectBannedTerms } from './banned-terms.mjs'

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

const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.json'])

function isExcludedPath(relPath) {
  const segments = relPath.split(/[\\/]/)
  if (segments.some((s) => EXCLUDED_SEGMENTS.has(s))) return true
  const basename = segments.at(-1)
  if (basename.startsWith('.env')) return true
  return false
}

function walk(root) {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath ?? entry.path, entry.name))
}

/**
 * Scans `engine/**` for a banned term, one match per (file, term, line).
 * Returns `{ violations, terms, gaps }` — `gaps` is `collectBannedTerms`'s,
 * passed through so the CLI can report which brands' domains went unchecked.
 */
export function lintBrandLiterals(repoRoot, { root = 'engine' } = {}) {
  const { terms, gaps } = collectBannedTerms(repoRoot)
  const violations = []
  if (terms.length === 0) {
    return { violations, terms, gaps }
  }
  const absRoot = join(repoRoot, root)
  let rootExists = true
  try {
    statSync(absRoot)
  } catch {
    rootExists = false
  }
  if (!rootExists) return { violations, terms, gaps }

  for (const absPath of walk(absRoot)) {
    const relPath = relative(repoRoot, absPath)
    const ext = '.' + relPath.split('.').pop()
    if (!SCANNED_EXTENSIONS.has(ext)) continue
    if (isExcludedPath(relPath)) continue
    const text = readFileSync(absPath, 'utf8')
    const lines = text.split('\n')
    lines.forEach((line, index) => {
      for (const term of terms) {
        if (line.includes(term)) {
          violations.push({ path: relPath.split(/[\\/]/).join('/'), line: index + 1, term })
        }
      }
    })
  }
  return { violations, terms, gaps }
}
