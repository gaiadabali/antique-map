/**
 * A site's copy: the values for the message keys the app defines (CONVENTIONS.md §6: keys in code,
 * values in files) — `engine/apps/web/src/sites/<site>/lexicon/<locale>.json`, a flat object of
 * key → text; `{name}` marks a value the app fills. The app imports each file (bundled, never read
 * from disk at runtime) and joins it with `createMessages()`; this entry keeps the file readers
 * the copy gate and the tests use: `readCopyFile()`, `checkCopy()` and `loadMessages()`.
 *
 * Server only: this entry (`@engine/i18n/copy`) reads files, so it is kept out of the root
 * entry, which a Client Component may import for the formatters.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { LocaleCode } from '@engine/config/constants'

import {
  createMessages,
  pluralCategoriesOf,
  pluralFormOf,
  textOf,
  type CopyValues,
  type Messages,
  type MessageSource,
} from './messages'

export type { CopyValues }

export class CopyFileError extends Error {
  override readonly name = 'CopyFileError'
}

const memo = new Map<string, CopyValues | null>()

/** The file's values, or `null` when there is no copy for the locale yet. */
export function readCopyFile(
  copyDir: string,
  locale: LocaleCode,
  options: { fresh?: boolean } = {},
): CopyValues | null {
  const file = join(copyDir, `${locale}.json`)
  if (!options.fresh && memo.has(file)) return memo.get(file) ?? null
  const values = existsSync(file) ? parseCopy(file) : null
  memo.set(file, values)
  return values
}

function parseCopy(file: string): CopyValues {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    throw new CopyFileError(
      `${file} is not JSON: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new CopyFileError(`${file} must be an object of message key → text`)
  }
  const values: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith('$')) continue // "$schema", "$comment": for editors, never a message
    if (typeof value !== 'string')
      throw new CopyFileError(`${file}: "${key}" must be text, not ${typeof value}`)
    values[key] = value
  }
  return values
}

/** The `{name}` placeholders in a text, sorted and unique. */
export function placeholdersOf(text: string): string[] {
  return [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? ''))].sort()
}

export type CopyIssue = {
  readonly locale: LocaleCode
  readonly key: string
  readonly kind: 'missing' | 'unknown' | 'placeholders'
  readonly message: string
}

/**
 * What a site's copy lacks or gets wrong against the app's keys, per locale — for CI and the
 * lexicon (TASKS.md 6.3): a key with no value, `''` included (the app's neutral default would
 * show); a value for a key the app does not define (a typo, or a key the app dropped); and a
 * value whose `{placeholders}` differ from the default's (the app fills names the text must
 * carry). Plural forms follow the locale's own rules: a form the locale never selects is not
 * required (Indonesian has `other` alone), a form it selects may be added even if the app's
 * defaults lack it, and a form other than `other` may carry fewer placeholders ("One item").
 */
export function checkCopy(input: {
  readonly defaults: Readonly<Record<string, string>>
  readonly copyDir: string
  readonly locales: readonly LocaleCode[]
}): CopyIssue[] {
  const { defaults } = input
  const issues: CopyIssue[] = []
  for (const locale of input.locales) {
    const copy = readCopyFile(input.copyDir, locale, { fresh: true }) ?? {}
    const categories = new Set(pluralCategoriesOf(locale))
    const push = (key: string, kind: CopyIssue['kind'], message: string) =>
      void issues.push({ locale, key, kind, message: `${locale}.json ${message}` })
    const checkPlaceholders = (key: string, value: string) => {
      const form = pluralFormOf(key, defaults)
      const want = placeholdersOf(defaults[form ? `${form.base}.other` : key] ?? '')
      const have = placeholdersOf(value)
      const fits =
        form && form.category !== 'other'
          ? have.every((name) => want.includes(name))
          : have.join() === want.join()
      const names = want.map((name) => `{${name}}`).join(' ') || 'none'
      if (!fits)
        push(
          key,
          'placeholders',
          `"${key}" must carry ${form && form.category !== 'other' ? `only from ${names}` : names}`,
        )
    }
    for (const key of Object.keys(defaults)) {
      const form = pluralFormOf(key, defaults)
      const value = textOf(copy, key)
      if (value !== undefined) checkPlaceholders(key, value)
      else if (!form || categories.has(form.category)) push(key, 'missing', `has no "${key}"`)
    }
    for (const key of Object.keys(copy)) {
      if (key in defaults) continue
      const form = pluralFormOf(key, defaults)
      const value = textOf(copy, key)
      if (form && categories.has(form.category)) {
        if (value !== undefined) checkPlaceholders(key, value)
      } else {
        push(key, 'unknown', `has "${key}", which the app does not define`)
      }
    }
  }
  return issues
}

/** Joins the app's keys with the copy files in `copyDir`. */
export function loadMessages<K extends string>(
  source: MessageSource<K> & { readonly copyDir: string },
): Messages<K> {
  const copy: Partial<Record<LocaleCode, CopyValues | null>> = {
    [source.locale]: readCopyFile(source.copyDir, source.locale),
    [source.defaultLocale]: readCopyFile(source.copyDir, source.defaultLocale),
  }
  return createMessages({ ...source, copy })
}
