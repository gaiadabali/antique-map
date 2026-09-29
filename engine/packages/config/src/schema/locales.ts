/**
 * @contract C1 — brand config: locales · owner: ARC · entry: `@engine/config/schema`
 *
 * Every database holds the superset `en`, `id`, `nl` (ARCHITECTURE.md §2, §11); a brand
 * serves a subset through routing, the default unprefixed. A leaf: the route map (C10)
 * and the identity floors build on it. The list itself is the zod-free
 * `@engine/config/constants` (`../constants`), re-exported here, so the browser can have it
 * without the schema.
 */
import { z } from 'zod'

import { LOCALE_CODES, type LocaleCode } from '../constants'

export { LOCALE_CODES, type LocaleCode }
export const localeCodeSchema = z.enum(LOCALE_CODES)

/** Text per locale; `validateBrandConfigs()` requires the brand's default locale. */
export const localisedTextSchema = z.partialRecord(localeCodeSchema, z.string().min(1))
export type LocalisedText = z.infer<typeof localisedTextSchema>
