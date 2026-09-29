// Discovers brand slugs from the brand folders on disk (BRANDS.md §2) instead
// of naming them: no file under engine/ may contain a brand's slug as a
// literal (CONVENTIONS.md §1), so the list a `--brand` value is checked
// against is read from the filesystem, never written here. `brand:create`
// (TASKS.md 2.2.h) adds a folder; this picks it up with no code change.
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// Top-level directories that are infrastructure, never a brand folder — a
// brand folder is `<slug>/README.md` + `site/` + `content/` (BRANDS.md §2).
// This is a denylist of repo scaffolding, not of brand names, so it never
// changes when a brand is added, renamed or removed.
const INFRA_DIRS = new Set([
  'engine',
  'docs',
  'scripts',
  'node_modules',
  'dist',
  'coverage',
  'test-results',
  'playwright-report',
])

/** Every brand folder's slug at `repoRoot`, sorted — a directory that is not denylisted and holds a `README.md`. */
export function discoverBrands(repoRoot) {
  return readdirSync(repoRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith('.') && !INFRA_DIRS.has(entry.name))
    .filter((entry) => existsSync(join(repoRoot, entry.name, 'README.md')))
    .map((entry) => entry.name)
    .sort()
}
