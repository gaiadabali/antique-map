/**
 * Who reads and writes the catalogue (CONTENT-MODEL.md §7), shared by works and the vocabulary
 * that describes them — makers, places, terms and sources.
 *
 * - **Read**: `DRAFTED_ACCESS` — the public sees published records only, the owner and the
 *   editors see drafts, and only they read `/versions` (`@engine/cms/access`, ARCHITECTURE.md
 *   §12). Loaders add their own `overrideAccess: false`, `_status: 'published'` and `select` on
 *   top.
 * - **Store staff read none of it** (CONTENT-MODEL.md §7: "—"): `DRAFTED_ACCESS` counts every
 *   `users` document as staff, which would show a store user every draft and every staff-only
 *   field, so their role is refused here before it is consulted.
 * - **Write, publish and delete**: the owner and the editors (DR-10: "editor — catalogue, content
 *   and orders").
 */
import type { Access } from 'payload'

import { DRAFTED_ACCESS } from '../../../access/published'
import { roleOf, staffWithRoles, type UserRole } from '../../users/roles'

/** The roles that write, publish and delete a catalogue record. */
export const VOCABULARY_PUBLISHERS = ['owner', 'editor'] as const satisfies readonly UserRole[]

const publishers = staffWithRoles(...VOCABULARY_PUBLISHERS)

/** `access`, except for a store user, who is refused. */
const notForStoreStaff =
  (access: Access): Access =>
  (args) =>
    roleOf(args.req.user) === 'store' ? false : access(args)

export const VOCABULARY_ACCESS = {
  read: notForStoreStaff(DRAFTED_ACCESS.read),
  readVersions: notForStoreStaff(DRAFTED_ACCESS.readVersions),
  create: publishers,
  update: publishers,
  delete: publishers,
} as const

/** The versions every vocabulary collection keeps: drafts, validated on every save. */
export const VOCABULARY_VERSIONS = {
  // `validate: true`: Payload would otherwise skip every field validator on a draft save, and
  // CONTENT-MODEL.md §8's every-save rules (dates in order, a valid address, a parent that is
  // no descendant) must hold on drafts too. What only publishing demands is checked against
  // `_status` in the validator itself (`./fields`, `requiredToPublish`).
  drafts: { validate: true },
} as const
