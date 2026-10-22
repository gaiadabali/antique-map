/**
 * The kind of private file a `masters` record describes (CONTENT-MODEL.md §5): a capture as
 * received, under `masters/` — C9 `masterKey()` or `intakeMasterKey()`. The outlet brand's print
 * files, and the `print-file` kind with them, went with the configurator (TASKS.md 2.4.b); the
 * kind stays a field so a later kind is a value, not a migration of every record.
 */
import { INTAKE_MASTERS_PREFIX } from '../contract'

export const MASTER_KINDS = ['capture'] as const
export type MasterKind = (typeof MASTER_KINDS)[number]

/** The prefix every capture's key starts with: `masterKey()`'s and `intakeMasterKey()`'s. */
export const CAPTURES_PREFIX = 'masters/'

/** The prefix a master of `kind` must live under in the masters bucket. */
export function kindPrefix(_kind: MasterKind): string {
  return CAPTURES_PREFIX
}

/** Whether a capture's key is an intake key (no work yet, or none at all). */
export function isIntakeKey(key: string): boolean {
  return key.startsWith(INTAKE_MASTERS_PREFIX)
}
