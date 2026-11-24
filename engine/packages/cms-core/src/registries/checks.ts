/**
 * The checks every CMS's collection and global lists pass before Payload sees them:
 *
 * - **A collection or global with drafts must say who reads its drafts**: `read` and
 *   `readVersions` both set (`DRAFTED_ACCESS`), or the config refuses to build — Payload's fallback
 *   for an unset `readVersions` is "any signed-in user", which would show a store user every draft
 *   through `/versions`.
 * - **A slug is listed once**: Payload would keep one and drop the other's table.
 */
import type { CollectionConfig, GlobalConfig } from 'payload'

type Drafted = Pick<CollectionConfig | GlobalConfig, 'slug' | 'versions'> & {
  access?: { read?: unknown; readVersions?: unknown }
}

/** Throws for a drafts collection or global that leaves `read` or `readVersions` unset. */
export function assertDraftAccess(kind: 'collection' | 'global', config: Drafted): void {
  const versions = config.versions
  const drafted = typeof versions === 'object' && versions !== null && Boolean(versions.drafts)
  if (!drafted) return
  const missing = (['read', 'readVersions'] as const).filter((key) => !config.access?.[key])
  if (missing.length > 0) {
    throw new Error(
      `${kind} "${config.slug}" has drafts but no access.${missing.join(' / access.')}: use DRAFTED_ACCESS (@engine/cms/access) — Payload would let any signed-in user read its drafts`,
    )
  }
}

/** Throws for a slug two entries share: Payload would keep one and drop the other's table. */
function assertUniqueSlugs(kind: 'collection' | 'global', configs: readonly Drafted[]): void {
  const seen = new Set<string>()
  for (const { slug } of configs) {
    if (seen.has(slug)) throw new Error(`registries/collections: ${kind} "${slug}" is listed twice`)
    seen.add(slug)
  }
}

/** Every collection, each checked for its draft access. */
export function checkedCollections(collections: readonly CollectionConfig[]): CollectionConfig[] {
  assertUniqueSlugs('collection', collections)
  for (const collection of collections) assertDraftAccess('collection', collection)
  return [...collections]
}

/** Every global, each checked for its draft access. */
export function checkedGlobals(globals: readonly GlobalConfig[]): GlobalConfig[] {
  assertUniqueSlugs('global', globals)
  for (const global of globals) assertDraftAccess('global', global)
  return [...globals]
}
