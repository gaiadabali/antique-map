// The synthetic brand's +30% rule (TASKS.md 6.3.b, 6.3.l, 6.3.m): its copy exists to catch
// overflow, so each lexicon value must be at least ceil(1.3 ×) the longest value a real brand
// gives that key in that locale — a layout that holds the test brand then holds every brand.
//
// Which brand is which comes from the configs, never a slug (CONVENTIONS.md §1): the synthetic
// brand is the one that keeps one config per storefront (`brand.<storefront>.json`, C1's
// `storefront` on the result), a real brand the one with a single `brand.config.json`.
//
// Only the lexicon is held to the rule (`LEXICON_MESSAGES`, by storefront): the shell's keys
// (`shell.*`, `home.title`, `home.lede`, `notFound.*`) carry locale names and `{brand}`, which
// padding would fill with filler, and the test copy's `$comment` says only lexicon values are
// lengthened.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { LEXICON_KEY_SOURCE } from './copy.mjs'
import { ENGINE_REPO_ROOT } from './supports.mjs'

export const OVERFLOW_MARGIN = 1.3

/**
 * The language the apps' neutral defaults are written in. A locale no real brand ships (`nl`)
 * is measured against those defaults and the real brands' values in this language.
 */
export const DEFAULTS_LOCALE = 'en'

/** A value's length in characters (code points), as a reader counts them. */
export const lengthOf = (text) => [...text].length

/** The least length a synthetic value may have against a longest real value of `longest`. */
export const leastLengthOver = (longest) => Math.ceil(OVERFLOW_MARGIN * longest)

/** Each app's lexicon keys, by storefront, loaded with `loadModule` (a TS runner's). */
export async function loadLexiconKeys(loadModule, apps, repoRoot = ENGINE_REPO_ROOT) {
  const { file, name } = LEXICON_KEY_SOURCE
  const lexicon = {}
  for (const [storefront, app] of Object.entries(apps)) {
    const declared = (await loadModule(join(repoRoot, 'engine', 'apps', app, file)))?.[name]
    if (typeof declared !== 'object' || declared === null)
      throw new Error(`engine/apps/${app}/${file} exports no \`${name}\``)
    lexicon[storefront] = Object.keys(declared)
  }
  return lexicon
}

const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null // the copy check reports a file that is not JSON
  }
}

const copyDirOf = (result) => join(dirname(result.file), 'copy')

/** The brands whose configs all passed, split into the synthetic folders and the real ones. */
function brandsIn(results) {
  const failing = new Set(results.filter((r) => r.issues.length > 0).map((r) => r.brand))
  const synthetic = new Map()
  const real = new Map()
  for (const result of results) {
    if (failing.has(result.brand)) continue
    const config = readJson(result.file)
    if (!config) continue
    const into = result.storefront === null ? real : synthetic
    const brand = into.get(result.brand) ?? {
      brand: result.brand,
      name: `${dirname(result.name)}/copy`,
      copyDir: copyDirOf(result),
      served: [],
    }
    brand.served.push({ storefront: config.storefront, locales: [...config.locales.supported] })
    into.set(result.brand, brand)
  }
  return { synthetic: [...synthetic.values()], real: [...real.values()] }
}

/** Each real brand's copy in `locale`, for the brands that ship it: `[{ brand, copy }]`. */
function realCopyIn(real, locale) {
  return real
    .filter(({ served }) => served.some(({ locales }) => locales.includes(locale)))
    .map(({ brand, copyDir }) => ({ brand, copy: readJson(join(copyDir, `${locale}.json`)) }))
    .filter(({ copy }) => copy !== null)
}

/** The longest of `candidates` (`[{ text, from }]`), or `null` when none has text. */
function longestOf(candidates) {
  let best = null
  for (const { text, from } of candidates) {
    if (typeof text !== 'string' || text === '') continue
    if (!best || lengthOf(text) > best.length) best = { length: lengthOf(text), from }
  }
  return best
}

/**
 * Checks each synthetic brand's lexicon values against the real brands' (`checks.keys` and
 * `checks.lexicon` by storefront, `checks.apps` storefront → app folder). Returns `{ passed,
 * problems }`: one `passed` line per synthetic folder with any value measured, one `problems`
 * line per value that is too short, naming the file, the key, both lengths and the real brand.
 */
export function checkOverflowCopy(results, { keys = {}, lexicon, apps = {} }) {
  const passed = []
  const problems = []
  if (!lexicon) return { passed, problems }
  const { synthetic, real } = brandsIn(results)
  // The rule is relative to the real brands: with none (a sandbox of the synthetic brand alone),
  // there is nothing to be 30% longer than.
  if (real.length === 0) return { passed, problems }
  for (const { brand, name, copyDir, served } of synthetic) {
    const counts = []
    const before = problems.length
    const locales = [...new Set(served.flatMap(({ locales }) => locales))]
    for (const locale of locales) {
      const copy = readJson(join(copyDir, `${locale}.json`))
      if (!copy) continue // the copy check reports a missing or broken file
      const own = realCopyIn(real, locale)
      const shipped = own.length > 0
      const reference = shipped ? own : realCopyIn(real, DEFAULTS_LOCALE)
      const storefronts = served.filter((each) => each.locales.includes(locale))
      const lexical = new Set(storefronts.flatMap(({ storefront }) => lexicon[storefront] ?? []))
      let measured = 0
      for (const key of Object.keys(copy)) {
        if (!lexical.has(key) || typeof copy[key] !== 'string') continue
        const candidates = reference.map(({ brand: from, copy: values }) => ({
          text: values[key],
          from: shipped ? from : `${from}'s ${DEFAULTS_LOCALE}`,
        }))
        if (!shipped)
          for (const { storefront } of storefronts)
            candidates.push({
              text: keys[storefront]?.[key],
              from: `the ${apps[storefront] ?? storefront} default`,
            })
        const longest = longestOf(candidates)
        if (!longest) continue
        measured += 1
        const least = leastLengthOver(longest.length)
        const length = lengthOf(copy[key])
        if (length < least)
          problems.push(
            `${brand}: ${name}/${locale}.json (${locale}): "${key}" is ${length} characters, under the +30% overflow rule: it needs ${least} (ceil(${OVERFLOW_MARGIN} × ${longest.length}, ${longest.from}))`,
          )
      }
      counts.push(`${locale} ${measured}`)
    }
    if (problems.length === before && counts.some((count) => !count.endsWith(' 0')))
      passed.push(
        `${name} (${brand}, lexicon values ≥ ceil(${OVERFLOW_MARGIN} ×) the longest real brand value: ${counts.join(', ')})`,
      )
  }
  return { passed, problems }
}
