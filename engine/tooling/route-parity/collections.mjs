// Collection slugs, read as data (never as a literal in this file — the same
// discipline as `lint-brand-literals`, though these are not brand names, just
// not worth duplicating). Two sources, both text, so no TypeScript runs:
//
//   - every `slug: '<slug>'` literal under `engine/packages/cms/src/collections/**`
//     — the collections built so far (3.2's `users`, and each one a task adds);
//   - the frozen list, `COLLECTION_SLUGS = [...]` in
//     `engine/packages/cms/src/registries/collections.ts` — every slug is in
//     the config from Foundation, a stub until its task fills it in
//     (CONTENT-MODEL.md), and a stub's `/api/<slug>` is Payload's as surely
//     as a built one's (TASKS.md 3.5.a).
//
// It degrades (reports `available: false`) only when neither source exists.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const CMS_SRC = ['engine', 'packages', 'cms', 'src']
const COLLECTIONS_DIR = [...CMS_SRC, 'collections']
const REGISTRY_FILE = [...CMS_SRC, 'registries', 'collections.ts']
const SLUG_PATTERN = /slug:\s*['"]([a-z][a-z0-9-]*)['"]/g
/** The frozen list's array literal: `COLLECTION_SLUGS = [ … ]`, with or without a type. */
const FROZEN_LIST = /\bCOLLECTION_SLUGS\b[^=]*=\s*\[([^\]]*)\]/
const QUOTED_SLUG = /['"]([a-z][a-z0-9-]*)['"]/g

/** Every `slug:` literal in the collection files under `dir`. */
function slugsInCollectionFiles(dir) {
  const slugs = []
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.ts')) continue
    const text = readFileSync(join(entry.parentPath ?? entry.path, entry.name), 'utf8')
    for (const match of text.matchAll(SLUG_PATTERN)) slugs.push(match[1])
  }
  return slugs
}

/** The quoted slugs of the registry's `COLLECTION_SLUGS` literal, or `null` when it has none. */
export function slugsInRegistry(text) {
  const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
  const list = FROZEN_LIST.exec(code)
  if (!list) return null
  return [...list[1].matchAll(QUOTED_SLUG)].map((match) => match[1])
}

/**
 * `{ slugs, available, sources }` — `available` is false when neither the
 * collections directory nor the registry exists yet, so the caller can report
 * the gap instead of silently checking nothing. `sources` names what was read.
 */
export function discoverCollectionSlugs(repoRoot) {
  const slugs = new Set()
  const sources = []
  const dir = join(repoRoot, ...COLLECTIONS_DIR)
  if (existsSync(dir)) {
    for (const slug of slugsInCollectionFiles(dir)) slugs.add(slug)
    sources.push(COLLECTIONS_DIR.join('/'))
  }
  const registry = join(repoRoot, ...REGISTRY_FILE)
  if (existsSync(registry)) {
    const listed = slugsInRegistry(readFileSync(registry, 'utf8'))
    if (listed === null) {
      throw new Error(
        `${REGISTRY_FILE.join('/')} has no COLLECTION_SLUGS = [...] literal for route-parity to read`,
      )
    }
    for (const slug of listed) slugs.add(slug)
    sources.push(`${REGISTRY_FILE.join('/')} COLLECTION_SLUGS`)
  }
  return { slugs: [...slugs].sort(), available: sources.length > 0, sources }
}
