/**
 * What is set once, at intake, stays as it was set (CONTENT-MODEL.md §6): an image's role and
 * provenance, and a master's. Provenance above all — it decides whether an image is labelled
 * "Digital mockup" or "AI-generated image" wherever it is shown, so a writer who changed
 * `ai-generated` to `photograph` would take the label off. A correction is the catalogue owners'
 * (admin, manager), or a script's on the Local API with no user; nobody else's, by any API.
 */
import { ValidationError, type CollectionBeforeChangeHook, type PayloadRequest } from 'payload'

import { hasRole } from '../../access/roles'

/** Who may correct what intake set: the catalogue's owners, or a script with no user. */
export function mayCorrectIntake(req: Pick<PayloadRequest, 'user' | 'payloadAPI'>): boolean {
  return hasRole(req.user, 'admin', 'manager') || (req.payloadAPI === 'local' && !req.user)
}

/** The fields among `fields` an update sets to something other than what is stored. */
export function changedFields(
  data: Record<string, unknown>,
  originalDoc: Record<string, unknown> | undefined,
  fields: readonly string[],
): string[] {
  if (!originalDoc) return []
  return fields.filter((field) => field in data && data[field] !== originalDoc[field])
}

/**
 * Refuses an update that changes any of `fields`, unless `allowed(req)` says this caller may.
 * `allowed` absent: nobody may, by any API.
 */
export function freezeAfterCreate(
  collection: string,
  fields: readonly string[],
  allowed?: (req: PayloadRequest) => boolean,
): CollectionBeforeChangeHook {
  return ({ data, operation, originalDoc, req }) => {
    if (operation !== 'update') return data
    const changed = changedFields(data, originalDoc, fields)
    if (changed.length === 0 || allowed?.(req)) return data
    throw new ValidationError({
      collection,
      errors: changed.map((path) => ({
        path,
        message: allowed
          ? `The ${path} was set at intake: only an admin or a manager may correct it.`
          : `The ${path} never changes once a record is made: make a new record.`,
      })),
    })
  }
}
