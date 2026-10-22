/**
 * The cataloguing workflow (CONTENT-MODEL.md §1 `cataloguing`, §8): `draft` → `catalogued` →
 * `verified`. Verifying is a cataloguer's claim — the owner or an editor makes it — and it cannot
 * stand while a field an AI drafted is still unchecked. The
 * moment of verification is recorded by the server, never typed.
 */
import { ValidationError, type CollectionBeforeChangeHook } from 'payload'

import { isStaffUser } from '../access/roles'
import { hasRole } from '../collections/users/roles'
import { WORK_PUBLISHERS } from '../collections/works/access'
import { unverifiedAiDraft } from '../collections/works/vocabulary'
import { asLabel, mergeOver, type Doc } from './work-facts'

export const stampCataloguing: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const sent = (data as Doc).cataloguing as Doc | undefined
  if (!sent || typeof sent !== 'object') return data
  const before = ((operation === 'update' ? (originalDoc as Doc | undefined) : undefined)
    ?.cataloguing ?? {}) as Doc
  const merged = mergeOver(before, sent)
  const verifying = merged.status === 'verified' && before.status !== 'verified'
  const errors: Array<{ path: string; message: string }> = []
  if (verifying && isStaffUser(req.user) && !hasRole(req.user, ...WORK_PUBLISHERS)) {
    errors.push({
      path: 'cataloguing.status',
      message: 'The owner or an editor verifies a record.',
    })
  }
  const unchecked = unverifiedAiDraft(merged.aiDraft).length > 0
  if (merged.status === 'verified' && unchecked) {
    errors.push({
      path: 'cataloguing.status',
      message: 'Check the fields an AI drafted, and record who and when, before verifying.',
    })
  }
  if (errors.length > 0) {
    const labelled = errors.map((error) => ({
      ...error,
      label: asLabel('Cataloguing status', error.message),
    }))
    throw new ValidationError({ collection: 'works', errors: labelled, req }, req.t)
  }
  const verifiedAt =
    merged.status !== 'verified'
      ? null
      : verifying
        ? new Date().toISOString()
        : (before.verifiedAt ?? new Date().toISOString())
  return { ...data, cataloguing: { ...sent, verifiedAt } }
}
