import { ValidationError, type CollectionBeforeChangeHook } from 'payload'

import { isPublishing } from '../../fields/validate'

/**
 * A page must have a title in the default locale before it publishes.
 * Saving stays cheap; publishing is the boundary.
 */
export const pagePublishGuard: CollectionBeforeChangeHook = ({ data, req }) => {
  if (!isPublishing(data)) return data
  const title = (data.title as Record<string, string> | undefined)?.en ?? ''
  if (title.trim().length === 0) {
    throw new ValidationError(
      {
        collection: 'pages',
        errors: [{ path: 'title', message: 'A published page needs a title in English.' }],
        req,
      },
      req.t,
    )
  }
  return data
}
