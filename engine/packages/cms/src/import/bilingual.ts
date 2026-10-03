/**
 * The rows carry a localised field as an `{ en, id }` pair, but Payload's Local API does not take
 * one: it writes the object into the operation's locale verbatim (as a stringified blob) and no
 * other locale at all. The codebase's own idiom (vocabulary.db.test.ts) is two writes — the
 * default locale first, then an update with `locale: 'id'` for the Indonesian values. The reads
 * answer it: `locale: 'all'` gives the stored locales back as the same `{ en, id }` pairs, which
 * is what `./diff` compares.
 */

/** A value the sheet carries as a locale pair: a plain object whose keys are `en`/`id`. */
export const isLocalePair = (value: unknown): value is Record<string, string | undefined> =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.entries(value as Record<string, unknown>).every(
    ([key, each]) =>
      (key === 'en' || key === 'id') && (each === undefined || typeof each === 'string'),
  )

/** The locale pair's English value, or the value itself when it is not a pair. */
export const asEnglish = (value: unknown): unknown => (isLocalePair(value) ? value.en : value)

/** A plain object (a group's value), not an array, a date or a locale pair. */
const isGroup = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  !(value instanceof Date) &&
  !isLocalePair(value)

/**
 * The row's data, split into the default-locale write and the Indonesian values — at any depth: a
 * localised field inside a group (`condition.notes`, `date.display`) splits as a top-level one
 * does, or the Local API would store the pair as a stringified blob in the default locale.
 */
export function splitLocales(data: Record<string, unknown>): {
  en: Record<string, unknown>
  id: Record<string, unknown>
} {
  const en: Record<string, unknown> = {}
  const id: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (isLocalePair(value)) {
      if (value.en !== undefined) en[key] = value.en
      if (value.id !== undefined) id[key] = value.id
    } else if (isGroup(value)) {
      const nested = splitLocales(value)
      en[key] = nested.en
      if (Object.keys(nested.id).length > 0) id[key] = nested.id
    } else {
      en[key] = value
    }
  }
  return { en, id }
}

/**
 * The stored value as the row's value would see it — what `./diff` compares. Only what the row
 * carries: a group's keys the row names (an empty cell never clears a field, so a stored key the
 * row leaves out is not a change), a pair's locales the row names, an array row's fields the row
 * names (the stored row's own `id` is not the sheet's), and a localised field the row writes as a
 * plain value compares with its default-locale (`en`) value, which is where that write lands.
 */
export function pairAs(data: unknown, stored: unknown): unknown {
  if (data === undefined || data === null) return stored
  if (Array.isArray(data)) {
    if (!Array.isArray(stored)) return stored
    return stored.map((each, index) => (index < data.length ? pairAs(data[index], each) : each))
  }
  const storedObject =
    stored !== null && typeof stored === 'object' && !Array.isArray(stored) && !(stored instanceof Date)
      ? (stored as Record<string, unknown>)
      : undefined
  if (typeof data !== 'object' || data instanceof Date) {
    // A plain value against a stored `{ en, id }` read: the write lands in the default locale.
    if (storedObject && Object.keys(storedObject).every((key) => key === 'en' || key === 'id')) {
      return storedObject.en
    }
    return stored
  }
  if (!storedObject) return stored
  const picked: Record<string, unknown> = {}
  for (const [key, each] of Object.entries(data as Record<string, unknown>)) {
    if (each !== undefined) picked[key] = pairAs(each, storedObject[key])
  }
  return picked
}
