// 2.2.b — no brand literal under `engine/` (CONVENTIONS.md §1).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { collectBannedTerms } from './banned-terms.mjs'
import { LEGACY_DOMAIN_DIGESTS, legacyDomainMatcher } from './legacy-domains.mjs'

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

/** A domain (a term with a dot) matches in any case, as DNS names do; a name or slug as spelled. */
function termMatcher(term) {
  if (!term.includes('.')) return (line) => line.includes(term)
  const lower = term.toLowerCase()
  return (_line, lowerLine) => lowerLine.includes(lower)
}

/**
 * Scans `engine/**` for a banned term, one match per (file, term, line): the
 * brands' config terms, and the legacy domains `legacyDigests` names
 * (`./legacy-domains.mjs`, TASKS.md 5.6.b). Returns `{ violations, terms,
 * legacy, gaps }` — `legacy` counts the legacy domains, and `gaps` is
 * `collectBannedTerms`'s, passed through so the CLI can report which brands'
 * domains went unchecked.
 */
export function lintBrandLiterals(
  repoRoot,
  { root = 'engine', legacyDigests = LEGACY_DOMAIN_DIGESTS } = {},
) {
  const { terms, gaps } = collectBannedTerms(repoRoot)
  const legacy = legacyDigests.length
  const violations = []
  if (terms.length === 0 && legacy === 0) {
    return { violations, terms, legacy, gaps }
  }
  const absRoot = join(repoRoot, root)
  let rootExists = true
  try {
    statSync(absRoot)
  } catch {
    rootExists = false
  }
  if (!rootExists) return { violations, terms, legacy, gaps }

  const matchers = terms.map((term) => ({ term, matches: termMatcher(term) }))
  const legacyHits = legacyDomainMatcher(legacyDigests)
  for (const absPath of walk(absRoot)) {
    const relPath = relative(repoRoot, absPath)
    const ext = '.' + relPath.split('.').pop()
    if (!SCANNED_EXTENSIONS.has(ext)) continue
    if (isExcludedPath(relPath)) continue
    const path = relPath.split(/[\\/]/).join('/')
    const lines = readFileSync(absPath, 'utf8').split('\n')
    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase()
      const found = matchers.filter(({ matches }) => matches(line, lowerLine)).map((m) => m.term)
      // A legacy domain a config also names is reported once, as the config spells it.
      const said = new Set(found.map((term) => term.toLowerCase()))
      found.push(...legacyHits(line).filter((domain) => !said.has(domain)))
      for (const term of found) violations.push({ path, line: index + 1, term })
    })
  }
  return { violations, terms, legacy, gaps }
}
