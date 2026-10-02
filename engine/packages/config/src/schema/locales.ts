/**
 * The locales (ARCHITECTURE.md §11): every site serves `en` and `id` (`SITES`), the default
 * unprefixed. The list itself is the zod-free
 * `@engine/config/constants` (`../constants`), re-exported here, so the browser can have it
 * without the schema.
 */
import { z } from 'zod'

import { LOCALE_CODES, type LocaleCode } from '../constants'

export { LOCALE_CODES, type LocaleCode }
export const localeCodeSchema = z.enum(LOCALE_CODES)

/** Text per locale. */
export const localisedTextSchema = z.partialRecord(localeCodeSchema, z.string().min(1))
export type LocalisedText = z.infer<typeof localisedTextSchema>
