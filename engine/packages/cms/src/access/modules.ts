/**
 * What a module flag may do to the CMS: hide a collection in the admin and refuse access to it —
 * never add or remove a table, a field or a locale (ARCHITECTURE.md §2, C1 modules). Every
 * collection is registered in every brand's config, so both brands' databases share one schema;
 * a brand without `retention.reviews` still has a `reviews` table, just no way to reach it.
 *
 * The flag is read **at request time**, inside the functions Payload calls, never while the
 * config is built: the config (and so the generated types, the import map and the migration
 * snapshot) is the same with `BRAND` unset as with any brand's (TASKS.md 2.2.g). With no brand
 * loaded — a CLI, the build — a module reads as off: the gate fails closed.
 */
import { hasModule, type BrandConfig, type ModuleKey } from '@engine/config/schema'
import type { Access } from 'payload'

import { activeBrand } from './brand'

export type BrandReader = () => Pick<BrandConfig, 'modules'> | null

export function moduleEnabled(key: ModuleKey, readBrand: BrandReader = activeBrand): boolean {
  const brand = readBrand()
  return brand !== null && hasModule(brand, key)
}

/** `admin.hidden` for a collection or global that belongs to `key`. */
export function hiddenUnlessModule(
  key: ModuleKey,
  readBrand: BrandReader = activeBrand,
): () => boolean {
  return () => !moduleEnabled(key, readBrand)
}

/** `access` that refuses everyone while `key` is off, and defers to `access` while it is on. */
export function whenModule(
  key: ModuleKey,
  access: Access,
  readBrand: BrandReader = activeBrand,
): Access {
  return (args) => (moduleEnabled(key, readBrand) ? access(args) : false)
}
