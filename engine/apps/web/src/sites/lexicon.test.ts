/**
 * The lexicons' contract (ticket 4.3.d): every key in each site's value files is spelled in both
 * `en` and `id` — except a plural form a locale's plural rules cannot pick (Bahasa Indonesia has
 * no `one` category) — and no key is unused: the source must name every key, literally or as a
 * dynamic family (`prefix.${…}`), the way `src/messages/keys.ts` spells contract codes. A bare
 * key is a C2 field label that form machinery reads by name, and a key under such a label is
 * that field's own sub-vocabulary; both stand without a literal. `$`-prefixed entries are file
 * metadata, not message keys.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SITES_ROOT = dirname(fileURLToPath(import.meta.url))

const corpusFiles: string[] = []
const walk = (dir: string): void => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path)
    else if (/\.(ts|tsx|mjs|css)$/.test(entry.name)) corpusFiles.push(path)
    else if (entry.name.endsWith('.json') && !path.includes('lexicon')) corpusFiles.push(path)
  }
}
walk(dirname(SITES_ROOT)) // the web app's src, the lexicon value files excluded

const CORPUS = corpusFiles.map((file) => readFileSync(file, 'utf8')).join('\n')

const LOCALES = ['en', 'id'] as const
type LexiconValues = Record<(typeof LOCALES)[number], Record<string, string>>

/** The plural categories the locale's rules can pick, lowercase (`Intl.PluralRules`). */
function pluralCategoriesOf(locale: string): ReadonlySet<string> {
  return new Set(
    new Intl.PluralRules(locale)
      .resolvedOptions()
      .pluralCategories.map((category) => category.toLowerCase()),
  )
}

/** The key's plural category — its last segment — or `null` when the last segment is no category. */
function pluralCategoryOf(key: string, categories: ReadonlySet<string>): string | null {
  const last = key.split('.').at(-1)
  return last !== undefined && categories.has(last) ? last : null
}

for (const site of ['gallery', 'shop'] as const) {
  describe(`the ${site} lexicon`, () => {
    const values = Object.fromEntries(
      LOCALES.map((locale) => [
        locale,
        JSON.parse(
          readFileSync(join(SITES_ROOT, site, 'lexicon', `${locale}.json`), 'utf8'),
        ) as Record<string, string>,
      ]),
    ) as LexiconValues
    const categories = Object.fromEntries(
      LOCALES.map((locale) => [locale, pluralCategoriesOf(locale)]),
    ) as Record<(typeof LOCALES)[number], ReadonlySet<string>>

    /** The key names that must be spelled in both files (plural forms a locale cannot pick aside). */
    const sharedKeys = Object.keys(values.en).filter((key) => {
      if (key.startsWith('$')) return false
      const category = pluralCategoryOf(key, categories.en)
      return category === null || categories.id.has(category)
    })

    it('spells every key in both en and id', () => {
      for (const key of sharedKeys) {
        expect(values.id, `id is missing “${key}”`).toHaveProperty(key)
        expect(values.en, `en is missing “${key}”`).toHaveProperty(key)
      }
      for (const locale of LOCALES) {
        const extras = Object.keys(values[locale]).filter(
          (key) =>
            !key.startsWith('$') &&
            !sharedKeys.includes(key) &&
            pluralCategoryOf(key, categories[locale]) === null,
        )
        expect(extras, `${locale} carries keys en does not`).toEqual([])
      }
    })

    it('carries no key the source never names', () => {
      const named = (key: string): boolean => {
        if (CORPUS.includes(key)) return true
        const parts = key.split('.')
        for (let at = 1; at < parts.length; at++) {
          if (CORPUS.includes(`${parts.slice(0, at).join('.')}.\${`)) return true
        }
        if (parts.length === 1) return true // a bare key is a C2 field label
        const head = parts[0]
        return head !== undefined && head in values.en // a child of a bare field label of this lexicon
      }
      const unnamed = sharedKeys.filter((key) => !named(key))
      expect(unnamed).toEqual([])
    })

    it('carries no empty value', () => {
      for (const locale of LOCALES) {
        for (const [key, value] of Object.entries(values[locale])) {
          if (!key.startsWith('$'))
            expect(value.trim().length, `${locale} “${key}”`).toBeGreaterThan(0)
        }
      }
    })
  })
}
