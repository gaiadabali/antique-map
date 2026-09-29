/**
 * `users.roles` — C1's `STAFF_ROLES` as a many-valued select (C1 `schema/accounts.ts` names it).
 * The option list is C1's, never redeclared, so a role added there reaches the admin and the
 * database enum together, in one migration. Wording for non-developers is 10.1's; the rights
 * are CONTENT-MODEL.md §8's.
 *
 * Saved to the session token so access checks read roles without a query. Only an admin sets
 * them: a member of staff cannot grant themselves more (field access), and the first user's
 * and last admin's cases are the collection's hooks (`./guards`).
 *
 * The default says what will happen: `admin` while nobody has an account — the create-first-user
 * screen would otherwise offer "Contributor" for an account the hook then makes an admin — and
 * `contributor` for everyone after. A function default reaches neither the DDL nor the types.
 */
import type { Field, PayloadRequest } from 'payload'

import {
  adminOnlyField,
  DEFAULT_STAFF_ROLE,
  STAFF_ROLES,
  USERS_SLUG,
  type StaffRole,
} from '../../access/roles'

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  cataloguer: 'Cataloguer',
  editor: 'Editor',
  fulfilment: 'Fulfilment',
  analyst: 'Analyst',
  contributor: 'Contributor',
}

export async function defaultRoles(req: PayloadRequest): Promise<StaffRole[]> {
  const { totalDocs } = await req.payload.count({
    collection: USERS_SLUG,
    overrideAccess: true,
    req,
  })
  return totalDocs === 0 ? ['admin'] : [DEFAULT_STAFF_ROLE]
}

export const rolesField: Field = {
  name: 'roles',
  type: 'select',
  hasMany: true,
  required: true,
  defaultValue: ({ req }: { req: PayloadRequest }) => defaultRoles(req),
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
