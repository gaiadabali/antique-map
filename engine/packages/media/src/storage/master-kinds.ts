/**
 * The two kinds of private file a `masters` record describes (CONTENT-MODEL.md §6): a capture as
 * received — under `masters/`, C9 `masterKey()` or `intakeMasterKey()` — or a design's print file,
 * under C9 `PRINT_FILES_PREFIX`, the only prefix an outlet brand's key may write.
 */
import { INTAKE_MASTERS_PREFIX, PRINT_FILES_PREFIX } from '../contract'

export const MASTER_KINDS = ['capture', 'print-file'] as const
export type MasterKind = (typeof MASTER_KINDS)[number]

/** The prefix every capture's key starts with: `masterKey()`'s and `intakeMasterKey()`'s. */
export const CAPTURES_PREFIX = 'masters/'

/** The prefix a master of `kind` must live under in the masters bucket. */
export function kindPrefix(kind: MasterKind): string {
  return kind === 'capture' ? CAPTURES_PREFIX : PRINT_FILES_PREFIX
}

/** Whether a capture's key is an intake key (no work yet, or none at all). */
export function isIntakeKey(key: string): boolean {
  return key.startsWith(INTAKE_MASTERS_PREFIX)
}
