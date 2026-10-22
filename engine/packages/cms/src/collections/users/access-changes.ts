/**
 * Role and store changes are recorded (SECURITY.md R7; TASKS.md 3.5.d). Every save of a `users`
 * document that sets its role or its store — the account's creation included — appends one row to
 * `accessChanges`: what the role and store were, what they became, who changed them and when.
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
import { ownerOnlyField, ROLE_LABELS, USER_ROLES } from './roles'

const nobody: FieldAccess = () => false

const roleOptions = USER_ROLES.map((role) => ({ label: ROLE_LABELS[role], value: role }))

export const accessChangesField: Field = {
  name: 'accessChanges',
  type: 'array',
  label: { en: 'Role and store changes', id: 'Perubahan peran dan toko' },
  access: { read: ownerOnlyField, create: nobody, update: nobody },
  admin: {
    readOnly: true,
    initCollapsed: true,
    description: {
      en: 'Recorded automatically whenever this person’s role or store changes.',
      id: 'Dicatat otomatis setiap kali peran atau toko orang ini berubah.',
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
  ],
}

type Id = number | string
type Row = {
  at: string
  by: Id | null
  fromRole: string | null
  toRole: string
  fromStore: Id | null
  toStore: Id | null
}
type UserData = { role?: unknown; store?: unknown; accessChanges?: unknown }

/** A relation as stored or populated, as its id; anything else as none. */
function idOf(value: unknown): Id | null {
  if (typeof value === 'number' || typeof value === 'string') return value === '' ? null : value
  const id = (value as { id?: unknown } | null | undefined)?.id
  return typeof id === 'number' || typeof id === 'string' ? id : null
}

const roleOf = (value: unknown): string | null => (typeof value === 'string' ? value : null)

export const recordAccessChanges: CollectionBeforeChangeHook<UserData & { id: Id }> = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const before = operation === 'update' ? originalDoc : undefined
  const fromRole = roleOf(before?.role)
  const fromStore = idOf(before?.store)
  const toRole = roleOf('role' in data ? data.role : before?.role)
  const toStore = idOf('store' in data ? data.store : before?.store)
  if (toRole === null) return data // the required-field check refuses it
  if (operation === 'update' && toRole === fromRole && String(toStore) === String(fromStore)) {
    return data
  }
  const stored = 'accessChanges' in data ? data.accessChanges : before?.accessChanges
  const rows = Array.isArray(stored) ? (stored as Row[]) : []
  const by = isStaffUser(req.user) ? idOf(req.user?.id) : null
  const row: Row = { at: new Date().toISOString(), by, fromRole, toRole, fromStore, toStore }
  return { ...data, accessChanges: [...rows, row] }
}
