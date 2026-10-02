/**
 * The plugins registry (PARALLEL-TRACKS.md §1). SCH's own plugin — media storage — is listed
 * here; a lane that needs a Payload plugin exports it from its package's barrel
 * (`@engine/<pkg>/plugins`) and the SCH lead adds the barrel's line.
 *
 * A plugin must not shape the schema by environment: whatever it adds, it adds the same in the
 * build as in a serving process — the storage plugin's `alwaysInsertFields` is the example
 * (`./storage`). `@payloadcms/plugin-ecommerce` is never registered (ARCHITECTURE.md §5).
 */
import type { Plugin } from 'payload'

import { uniqueEntries, type RegistryEntry } from './entries'
import { mediaStoragePlugin } from './storage'

type Env = Readonly<Record<string, string | undefined>>

export function pluginEntries(env: Env): readonly RegistryEntry<Plugin>[] {
  return [
    // SCH — S3-compatible media storage (R2 / MinIO), every upload collection
    { name: 'media-storage', owner: 'SCH', value: mediaStoragePlugin(env) },
  ]
}

export function registeredPlugins(
  env: Env,
  entries: readonly RegistryEntry<Plugin>[] = pluginEntries(env),
): Plugin[] {
  return uniqueEntries('plugins', entries)
}
