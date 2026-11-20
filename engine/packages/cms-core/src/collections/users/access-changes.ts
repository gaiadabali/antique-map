/**
 * Role and store changes are recorded (SECURITY.md R7; TASKS.md 3.5.d). Every save of a `users`
 * document that sets its role or its store — the account's creation included — appends one row to
 * `accessChanges`: what the role and store were, what they became, who changed them and when. A
 * CMS without the `store` role records the role alone (`{ stores: false }`).
 *
 * - **Written by this hook alone**, on every Payload write path (the admin, REST, the Local API, a
 *   seed): the field's create and update access is nobody's, so whatever a request sends for it is
 *   dropped before the hooks run, and the hook appends to the rows already stored.
 * - **Read by the owner alone**, as the role and the store are set by the owner alone
 *   (`./roles-field`). An editor or store user reading their own account sees no history.
 * - Judged on the user **as it will be saved**: after the first-user rule, the store rule (which
 *   clears a non-store role's store) and the last-owner guard, so a refused change records nothing
 *   and a cleared store is recorded as cleared.
 * - `by` is empty for a change made with no signed-in user: the create-first-user screen, a seed,
 *   a script.
 *
 * Raw SQL passes no hook, as with every rule here; the database's last-owner backstop still holds.
 */
import type { CollectionBeforeChangeHook, Field, FieldAccess } from 'payload'

import { isStaffUser } from '../../access/roles'
import { ownerOnlyField, ROLE_LABELS, USER_ROLES, type UserRole } from '../../access/user-roles'

const nobody: FieldAccess = () => false

/** Whether the record carries a store: the CMS has the `store` role. */
type Stores = { readonly stores: boolean }

const STORE_COLUMNS: Field[] = [
  {
    name: 'fromStore',
    type: 'relationship',
    relationTo: 'stores',
    label: { en: 'Store before', id: 'Toko sebelumnya' },
  },
  {
    name: 'toStore',
    type: 'relationship',
    relationTo: 'stores',
    label: { en: 'Store after', id: 'Toko sesudahnya' },
  },
]

/** The owner-only history of `roles` (and, with `stores`, of the store). */
export function accessChangesFieldFor(roles: readonly UserRole[], { stores }: Stores): Field {
  const roleOptions = roles.map((role) => ({ label: ROLE_LABELS[role], value: role }))
  return {
    name: 'accessChanges',
    type: 'array',
    label: stores
      ? { en: 'Role and store changes', id: 'Perubahan peran dan toko' }
      : { en: 'Role changes', id: 'Perubahan peran' },
    access: { read: ownerOnlyField, create: nobody, update: nobody },
    admin: {
      readOnly: true,
      initCollapsed: true,
      description: stores
        ? {
            en: 'Recorded automatically whenever this person’s role or store changes.',
            id: 'Dicatat otomatis setiap kali peran atau toko orang ini berubah.',
          }
        : {
            en: 'Recorded automatically whenever this person’s role changes.',
            id: 'Dicatat otomatis setiap kali peran orang ini berubah.',
          },
    },
    fields: [
      { name: 'at', type: 'date', required: true, label: { en: 'When', id: 'Kapan' } },
      { name: 'by', type: 'relationship', relationTo: 'users', label: { en: 'By', id: 'Oleh' } },
      {
        name: 'fromRole',
        type: 'select',
        options: roleOptions,
        label: { en: 'Role before', id: 'Peran sebelumnya' },
      },
      {
        name: 'toRole',
        type: 'select',
        options: roleOptions,
        required: true,
        label: { en: 'Role after', id: 'Peran sesudahnya' },
      },
      ...(stores ? STORE_COLUMNS : []),
    ],
  }
}

/** Every role and the store: the one CMS's. */
export const accessChangesField: Field = accessChangesFieldFor(USER_ROLES, { stores: true })

type Id = number | string
type Row = {
  at: string
  by: Id | null
  fromRole: string | null
  toRole: string
  fromStore?: Id | null
  toStore?: Id | null
}
type UserData = { role?: unknown; store?: unknown; accessChanges?: unknown }
type Hook = CollectionBeforeChangeHook<UserData & { id: Id }>

/** A relation as stored or populated, as its id; anything else as none. */
function idOf(value: unknown): Id | null {
  if (typeof value === 'number' || typeof value === 'string') return value === '' ? null : value
  const id = (value as { id?: unknown } | null | undefined)?.id
  return typeof id === 'number' || typeof id === 'string' ? id : null
}

const roleOf = (value: unknown): string | null => (typeof value === 'string' ? value : null)

function recorder({ stores }: Stores): Hook {
  return ({ data, operation, originalDoc, req }) => {
    const before = operation === 'update' ? originalDoc : undefined
    const fromRole = roleOf(before?.role)
    const fromStore = stores ? idOf(before?.store) : null
    const toRole = roleOf('role' in data ? data.role : before?.role)
    const toStore = stores ? idOf('store' in data ? data.store : before?.store) : null
    if (toRole === null) return data // the required-field check refuses it
    if (operation === 'update' && toRole === fromRole && String(toStore) === String(fromStore)) {
      return data
    }
    const stored = 'accessChanges' in data ? data.accessChanges : before?.accessChanges
    const rows = Array.isArray(stored) ? (stored as Row[]) : []
    const by = isStaffUser(req.user) ? idOf(req.user?.id) : null
    const at = new Date().toISOString()
    const row: Row = stores
      ? { at, by, fromRole, toRole, fromStore, toStore }
      : { at, by, fromRole, toRole }
    return { ...data, accessChanges: [...rows, row] }
  }
}

/** Role and store: the one CMS's (`roles.test`). */
export const recordAccessChanges: Hook = recorder({ stores: true })
const recordRoleChanges: Hook = recorder({ stores: false })

/** The hook that appends the row (with `stores`, the store's columns too); one of two constants. */
export function recordingAccessChanges({ stores }: Stores): Hook {
  return stores ? recordAccessChanges : recordRoleChanges
}
