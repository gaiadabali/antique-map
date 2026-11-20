/**
 * A media record's title in the admin (TASKS.md 27.7): its `label`, derived on every save and never
 * typed — an image's alt text, a video's or a PDF's title, else its file's name. The collection's
 * `useAsTitle` was `alt`, which a video or a PDF leaves empty, so their edit screens were headed by
 * the record's number. Localized as the words it is made of; hidden, as nobody edits it.
 */
import type { CollectionBeforeChangeHook, Field } from 'payload'

type Data = Record<string, unknown>

export const LABEL_FIELD: Field = {
  name: 'label',
  type: 'text',
  label: { en: 'Name in the admin', id: 'Nama di admin' },
  localized: true,
  admin: { hidden: true, readOnly: true },
}

const words = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined

/** The label of a record of `kind`: its alt text or title, else its file's name, else null. */
export function labelOf(kind: unknown, data: Data, stored: Data | undefined): unknown {
  const source = kind === 'image' ? 'alt' : 'title'
  const own = source in data ? data[source] : stored?.[source]
  const fallback = words(data.filename) ?? words(stored?.filename) ?? null
  // A write in every locale at once (`locale: 'all'`) carries `{ en, id }`: one label per locale.
  if (own !== null && typeof own === 'object') {
    return Object.fromEntries(
      Object.entries(own as Data).map(([locale, value]) => [locale, words(value) ?? fallback]),
    )
  }
  return words(own) ?? fallback
}

/** After `deriveFromFile`, which settles the kind: the label from the words being saved. */
export const labelFromWords: CollectionBeforeChangeHook = ({ data, originalDoc }) => ({
  ...data,
  label: labelOf(data.kind, data as Data, originalDoc as Data | undefined),
})
