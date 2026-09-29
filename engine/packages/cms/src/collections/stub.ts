/**
 * A frozen slug's stub (CONTENT-MODEL.md "The frozen slug list", TASKS.md 3.2.e, 3.2.g). Every
 * slug exists in the config from the Foundation stage so collections that relate to each other
 * can be built in parallel; each stub lives in its own `collections/<slug>/index.ts`, and the task
 * that owns the slug replaces that one file's contents — never the registry.
 *
 * A stub is a table with an id and timestamps and no way in: hidden in the admin, readable by
 * admins only, writable by nobody. Its slug is written literally in its own file (route parity
 * reads collection slugs from these files, engine/tooling/route-parity/collections.mjs).
 */
import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/roles'

const nobody = () => false

export function stubCollection(config: { slug: string }): CollectionConfig {
  return {
    slug: config.slug,
    admin: { hidden: true },
    access: { read: isAdmin, create: nobody, update: nobody, delete: nobody },
    fields: [],
  }
}
