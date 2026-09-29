/**
 * @contract C1 — brand config: the engine's locales, zod-free · owner: ARC · entry: `@engine/config/constants`
 *
 * Every database holds the superset `en`, `id`, `nl` (ARCHITECTURE.md §2, §11); a brand serves a
 * subset through routing, its default unprefixed. Declared here as plain data so a Client
 * Component's formatter (`@engine/i18n`) never pulls in the schema library; `../schema/locales`
 * builds the zod enum on this list and re-exports it.
 */
export const LOCALE_CODES = ['en', 'id', 'nl'] as const
export type LocaleCode = (typeof LOCALE_CODES)[number]
