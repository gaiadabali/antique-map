// Collection slugs, read as data (never as a literal in this file — the same
// discipline as `lint-brand-literals`, though these are not brand names, just
// not worth duplicating). No `engine/packages/cms` exists yet (Payload boot
// is TASKS.md 3.2+), so this degrades until it does.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const COLLECTIONS_DIR = ['engine', 'packages', 'cms', 'src', 'collections']
const SLUG_PATTERN = /slug:\s*['"]([a-z][a-z0-9-]*)['"]/g

/**
 * `{ slugs, available }` — `available` is false when the collections
 * directory does not exist yet, so the caller can report the gap instead of
 * silently checking nothing.
 */
export function discoverCollectionSlugs(repoRoot) {
  const dir = join(repoRoot, ...COLLECTIONS_DIR)
  if (!existsSync(dir)) return { slugs: [], available: false }
  const slugs = new Set()
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.ts')) continue
    const text = readFileSync(join(entry.parentPath ?? entry.path, entry.name), 'utf8')
    for (const match of text.matchAll(SLUG_PATTERN)) slugs.add(match[1])
  }
  return { slugs: [...slugs].sort(), available: true }
}
