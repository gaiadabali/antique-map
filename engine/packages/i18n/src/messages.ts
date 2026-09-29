/**
 * The message-key loader (BRANDS.md §2). An app defines its keys with neutral defaults
 * (`defineMessages`); the brand supplies the values in its copy files, which `loadMessages()`
 * (`@engine/i18n/copy`) reads on the server; `createMessages()` joins them for one locale: the
 * brand's value in that locale, else in the brand's default locale, else the app's neutral
 * default — and records each key that fell back, so a gap is visible rather than silently
 * English. Brand voice never sits inside `engine/`. This file reads nothing, so it is safe in a
 * Client Component given the values it renders.
 *
 * `{name}` is filled from the params (a number in the locale's digits). A count picks a plural
 * form: `t('cart.items', { count })` reads `cart.items.one` or `cart.items.other` by the
 * locale's plural rules.
 */
import type { LocaleCode } from '@engine/config/schema'

import { formattingTag } from './locales'

/** An app's keys and their neutral defaults, kept literal so a misspelt key is a type error. */
export function defineMessages<const T extends Record<string, string>>(defaults: T): T {
  return defaults
}

/** One locale's values from a brand's copy, key → text. */
export type CopyValues = Readonly<Record<string, string>>

export type MessageParams = Readonly<Record<string, string | number>>

/** `cart.items` for keys `cart.items.one` / `cart.items.other`. */
export type PluralBase<K extends string> = K extends `${infer Base}.other` ? Base : never

export type Messages<K extends string> = {
  readonly locale: LocaleCode
  t(key: K | PluralBase<K>, params?: MessageParams): string
  /** Keys this locale's copy lacks: each shows the brand default locale's value or the app's. */
  readonly missing: readonly K[]
}

export type MessageSource<K extends string> = {
  readonly defaults: Readonly<Record<K, string>>
  readonly locale: LocaleCode
  /** The brand's default locale, the first fallback. */
  readonly defaultLocale: LocaleCode
}

/** The plural categories a locale's rules select from: Indonesian `other` alone, English `one` and `other`. */
export function pluralCategoriesOf(locale: LocaleCode): readonly string[] {
  return new Intl.PluralRules(formattingTag(locale)).resolvedOptions().pluralCategories
}

const PLURAL_FORM = /^(.+)\.(zero|one|two|few|many|other)$/

/** `cart.items.one` → `{ base: 'cart.items', category: 'one' }`, when the app defines `cart.items.other`. */
export function pluralFormOf(
  key: string,
  defaults: Readonly<Record<string, string>>,
): { readonly base: string; readonly category: string } | null {
  const match = PLURAL_FORM.exec(key)
  const [, base, category] = match ?? []
  return base && category && `${base}.other` in defaults ? { base, category } : null
}

/** A copy value, where `''` reads as absent: an empty value is a gap, never a blank. */
export function textOf(copy: CopyValues, key: string): string | undefined {
  const value = copy[key]
  return value === undefined || value === '' ? undefined : value
}

/** Joins an app's keys with copy already in hand (tests, a preview). */
export function createMessages<K extends string>(
  source: MessageSource<K> & { readonly copy: Partial<Record<LocaleCode, CopyValues | null>> },
): Messages<K> {
  const own = source.copy[source.locale] ?? {}
  const fallback = source.copy[source.defaultLocale] ?? {}
  const categories = new Set(pluralCategoriesOf(source.locale))
  const keys = Object.keys(source.defaults) as K[]
  const values = new Map<string, string>()
  const missing: K[] = []
  for (const key of keys) {
    const value = textOf(own, key) ?? textOf(fallback, key) ?? source.defaults[key]
    // A plural form the locale never selects (Indonesian `one`) is not a gap in its copy.
    const form = pluralFormOf(key, source.defaults)
    const needed = !form || categories.has(form.category)
    if (needed && textOf(own, key) === undefined) missing.push(key)
    values.set(key, value)
  }
  // A brand may write a form its locale selects that the app's defaults lack (a `few`).
  for (const key of Object.keys(own)) {
    const form = pluralFormOf(key, source.defaults)
    const text = textOf(own, key)
    if (form && categories.has(form.category) && text !== undefined && !values.has(key)) {
      values.set(key, text)
    }
  }
  const tag = formattingTag(source.locale)
  const numbers = new Intl.NumberFormat(tag)
  const plurals = new Intl.PluralRules(tag)
  const fill = (text: string, params: MessageParams) =>
    text.replace(/\{(\w+)\}/g, (whole, name: string) => {
      const value = params[name]
      if (value === undefined) return whole
      return typeof value === 'number' ? numbers.format(value) : value
    })
  return {
    locale: source.locale,
    missing,
    t(key, params = {}) {
      let text = values.get(key)
      const count = params.count
      if (text === undefined && typeof count === 'number') {
        text = values.get(`${key}.${plurals.select(count)}`) ?? values.get(`${key}.other`)
      }
      // A key no app defines cannot type-check; at runtime it shows as itself, never blank.
      return fill(text ?? key, params)
    },
  }
}
