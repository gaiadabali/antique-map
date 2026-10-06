import { ValidationError, type CollectionBeforeChangeHook, type PayloadRequest } from 'payload'

import { isBlank, isPublishing } from '../../fields/validate'

/**
 * A page must have a title in the default locale before it publishes.
 * Saving stays cheap; publishing is the boundary.
 *
 * The admin saves one locale at a time, so `data.title` is that locale's plain string; only a
 * `locale: 'all'` write sends the `{ en, id }` object. A publish in another locale reads the
 * stored English title (latest draft included), since the English one is what the page falls
 * back to.
 */
export const pagePublishGuard: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (!isPublishing(data)) return data
  const title = await englishTitle(
    data.title,
    originalDoc as { id?: number | string } | undefined,
    req,
  )
  if (isBlank(title)) {
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

const DEFAULT_LOCALE = 'en'

export async function englishTitle(
  title: unknown,
  originalDoc: { id?: number | string } | undefined,
  req: PayloadRequest,
): Promise<string> {
  if (title !== null && typeof title === 'object') {
    return String((title as Record<string, unknown>)[DEFAULT_LOCALE] ?? '')
  }
  const locale = req.locale ?? DEFAULT_LOCALE
  if (locale === DEFAULT_LOCALE || locale === 'all') return typeof title === 'string' ? title : ''
  // A save in another locale: the English title is the stored one.
  if (originalDoc?.id === undefined) return ''
  const stored = await req.payload.findByID({
    collection: 'pages',
    id: originalDoc.id,
    locale: DEFAULT_LOCALE,
    fallbackLocale: false,
    draft: true,
    depth: 0,
    select: { title: true },
    overrideAccess: true,
    req,
  })
  return typeof stored?.title === 'string' ? stored.title : ''
}
