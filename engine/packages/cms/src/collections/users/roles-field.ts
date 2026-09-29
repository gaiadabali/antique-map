/**
 * `users.roles` — C1's `STAFF_ROLES` as a many-valued select (C1 `schema/accounts.ts` names it).
 * The option list is C1's, never redeclared, so a role added there reaches the admin and the
 * database enum together, in one migration. Wording for non-developers is 10.1's; the rights
 * are CONTENT-MODEL.md §8's.
 *
 * Saved to the session token so access checks read roles without a query. Only an admin sets
 * them: a member of staff cannot grant themselves more (field access), and the first user's
 * and last admin's cases are the collection's hooks (`./guards`).
 */
import type { Field } from 'payload'

import { adminOnlyField, DEFAULT_STAFF_ROLE, STAFF_ROLES, type StaffRole } from '../../access/roles'

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  cataloguer: 'Cataloguer',
  editor: 'Editor',
  fulfilment: 'Fulfilment',
  analyst: 'Analyst',
  contributor: 'Contributor',
}

export const rolesField: Field = {
  name: 'roles',
  type: 'select',
  hasMany: true,
  required: true,
  defaultValue: [DEFAULT_STAFF_ROLE],
  saveToJWT: true,
  options: STAFF_ROLES.map((role) => ({ label: ROLE_LABELS[role], value: role })),
  access: {
    create: adminOnlyField,
    update: adminOnlyField,
  },
  admin: {
    description:
      'Admin: everything, including staff and settings. Manager: catalogue, prices, orders, refunds. Cataloguer: works, makers, places, media — no prices or orders. Editor: stories, pages, curations; publishes. Fulfilment: orders, shipments, returns. Analyst: read-only and dashboards. Contributor: drafts only.',
  },
}
