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

/** The row's data, split into the default-locale write and the Indonesian values. */
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
    } else {
      en[key] = value
    }
  }
  return { en, id }
}

/**
 * The record's value as the row's pair would see it: only the locales the pair names, so a record
 * with more locales stored than the row carries compares as the row's shape.
 */
export function pairAs(data: Record<string, unknown>, stored: unknown): unknown {
  if (!isLocalePair(data) || !isLocalePair(stored)) return stored
  const picked: Record<string, string | undefined> = {}
  for (const key of ['en', 'id'] as const) {
    if (data[key] !== undefined) picked[key] = stored[key]
  }
  return picked
}
