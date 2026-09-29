/**
 * A brand's copy: `<brand>/site/copy/<locale>.json`, the values for the message keys an app
 * defines (BRANDS.md §2: apps own keys; brands own words). A flat object of key → text;
 * `{name}` marks a value the app fills. The folder is found by `@engine/config`'s loader
 * (`BrandPaths.copyDir`) and read at runtime, never at build — it ships inside the brand
 * folder, so a brand's voice changes with a deploy of its folder, not a rebuild of the app.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { LocaleCode } from '@engine/config/schema'

/** One locale's values, key → text. */
export type CopyValues = Readonly<Record<string, string>>

export class CopyFileError extends Error {
  override readonly name = 'CopyFileError'
}

const memo = new Map<string, CopyValues | null>()

/** The file's values, or `null` when the brand has no copy for the locale yet. */
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
 * What a brand's copy lacks or gets wrong against an app's keys, per locale — for CI and the
 * lexicon (TASKS.md 6.3): a key with no value (the app's neutral default would show), a value
 * for a key the app does not define (a typo, or a key the app dropped), and a value whose
 * `{placeholders}` differ from the default's (the app fills names the text must carry).
 */
export function checkCopy(input: {
  readonly defaults: Readonly<Record<string, string>>
  readonly copyDir: string
  readonly locales: readonly LocaleCode[]
}): CopyIssue[] {
  const issues: CopyIssue[] = []
  for (const locale of input.locales) {
    const copy = readCopyFile(input.copyDir, locale, { fresh: true }) ?? {}
    for (const [key, fallback] of Object.entries(input.defaults)) {
      const value = copy[key]
      if (value === undefined) {
        issues.push({ locale, key, kind: 'missing', message: `${locale}.json has no "${key}"` })
      } else if (placeholdersOf(value).join() !== placeholdersOf(fallback).join()) {
        const want =
          placeholdersOf(fallback)
            .map((name) => `{${name}}`)
            .join(' ') || 'none'
        issues.push({
          locale,
          key,
          kind: 'placeholders',
          message: `${locale}.json "${key}" must carry ${want}`,
        })
      }
    }
    for (const key of Object.keys(copy)) {
      if (!(key in input.defaults)) {
        issues.push({
          locale,
          key,
          kind: 'unknown',
          message: `${locale}.json has "${key}", which the app does not define`,
        })
      }
    }
  }
  return issues
}
