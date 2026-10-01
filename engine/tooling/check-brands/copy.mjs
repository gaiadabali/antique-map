// The copy half of `check:brands` (TASKS.md 6.3.e): each brand's `site/copy/<locale>.json`
// checked by `checkCopy()` (`@engine/i18n/copy`) against the message keys of the app that renders
// it, for every locale its config supports. The synthetic brand runs on both apps from one copy
// folder, so its folder is checked against each app's keys over that config's locales, and a key
// counts as unknown only when neither app defines it — the union of both apps' keys.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { ENGINE_REPO_ROOT } from './supports.mjs'

/**
 * Where an app defines the keys a brand's copy gives values for, each a `defineMessages()` export
 * the app itself loads with `loadMessages()`: the lexicon (`keys.ts`, composing `lexicon/*.ts`)
 * and the shell's own keys. The spike's (`src/spike/messages.ts`, 4.1.e) are not here: no brand
 * gives the spike copy, and it renders on its neutral defaults.
 */
export const COPY_KEY_SOURCES = [
  { file: 'src/messages/keys.ts', name: 'LEXICON_MESSAGES' },
  { file: 'src/shell/messages.ts', name: 'SHELL_MESSAGES' },
]

const isDefaults = (value) =>
  typeof value === 'object' &&
  value !== null &&
  Object.values(value).every((text) => typeof text === 'string')

/**
 * Loads each app's copy keys with `loadModule` (a TypeScript runner's), keyed by storefront —
 * `apps` is `loadSupports()`'s storefront → app folder. Throws on a source with no such export, or
 * a key two sources give different defaults: the gate could not say which the copy must match.
 */
export async function loadCopyKeys(loadModule, apps, repoRoot = ENGINE_REPO_ROOT) {
  const keys = {}
  for (const [storefront, app] of Object.entries(apps)) {
    const defaults = {}
    for (const { file, name } of COPY_KEY_SOURCES) {
      const at = `engine/apps/${app}/${file}`
      const declared = (await loadModule(join(repoRoot, 'engine', 'apps', app, file)))?.[name]
      if (!isDefaults(declared)) throw new Error(`${at} exports no \`${name}\` of key → text`)
      for (const [key, text] of Object.entries(declared)) {
        if (key in defaults && defaults[key] !== text)
          throw new Error(
            `${at} gives "${key}" a default another of the app’s key files differs on`,
          )
        defaults[key] = text
      }
    }
    keys[storefront] = defaults
  }
  return keys
}

/** The storefront and supported locales of a config that passed its own validation. */
function servedBy(result) {
  const { storefront, locales } = JSON.parse(readFileSync(result.file, 'utf8'))
  return { storefront, locales: [...locales.supported] }
}

const joinApps = (names) => (names.length === 1 ? `${names[0]} app` : `${names.join(' + ')} apps`)

/**
 * Checks each brand's copy folder with `checks` (`checkCopy`, `keys` by storefront, `apps` by
 * storefront) against the configs in `results`, for each brand whose configs all passed.
 * Returns `{ passed, problems }`: one `passed` line per clean folder; one `problems` line per
 * issue, naming the brand, the file, the app, the locale and the key.
 */
export function checkBrandsCopy(results, { checkCopy, keys, apps = {} }) {
  // A brand with a config in error is reported by its config; its copy waits until that passes.
  const failing = new Set(results.filter((r) => r.issues.length > 0).map((r) => r.brand))
  const folders = new Map()
  for (const result of results) {
    if (failing.has(result.brand)) continue
    const copyDir = join(dirname(result.file), 'copy')
    const name = `${dirname(result.name)}/copy`
    const folder = folders.get(copyDir) ?? { brand: result.brand, name, served: [] }
    folder.served.push(servedBy(result))
    folders.set(copyDir, folder)
  }
  const passed = []
  const problems = []
  for (const [copyDir, { brand, name, served }] of folders) {
    const found = checkFolder({ brand, name, copyDir, served, checkCopy, keys, apps })
    problems.push(...found)
    if (found.length === 0) {
      const matrix = served.map(({ storefront, locales }) => {
        const app = apps[storefront] ?? storefront
        return `${app} app × ${locales.join(' ')}, ${Object.keys(keys[storefront]).length} keys`
      })
      passed.push(`${name} (${brand}, ${matrix.join('; ')})`)
    }
  }
  return { passed, problems }
}

function checkFolder({ brand, name, copyDir, served, checkCopy, keys, apps }) {
  const problems = []
  const appOf = (storefront) => apps[storefront] ?? storefront
  const locales = [...new Set(served.flatMap((each) => each.locales))]
  const present = new Set()
  for (const locale of locales) {
    if (existsSync(join(copyDir, `${locale}.json`))) present.add(locale)
    else {
      const by = served
        .filter((each) => each.locales.includes(locale))
        .map((each) => each.storefront)
      problems.push(
        `${brand}: ${name}/${locale}.json: is missing (${locale} is a supported locale of the ${joinApps(by.map(appOf))})`,
      )
    }
  }
  const known = new Set(served.flatMap(({ storefront }) => Object.keys(keys[storefront] ?? {})))
  const found = new Map()
  for (const { storefront, locales: own } of served) {
    const defaults = keys[storefront]
    if (!defaults) {
      problems.push(
        `${brand}: ${name}: the ${appOf(storefront)} app has no copy keys to check against`,
      )
      continue
    }
    let issues
    try {
      issues = checkCopy({ defaults, copyDir, locales: own.filter((each) => present.has(each)) })
    } catch (error) {
      problems.push(`${brand}: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }
    for (const issue of issues) {
      const id = [issue.locale, issue.key, issue.kind, issue.message].join('\0')
      const seen = found.get(id) ?? { issue, storefronts: [] }
      seen.storefronts.push(storefront)
      found.set(id, seen)
    }
  }
  for (const { issue, storefronts } of found.values()) {
    if (issue.kind === 'unknown') {
      // Unknown to every app that renders this folder, in every app that serves the locale.
      const serving = served.filter((each) => each.locales.includes(issue.locale))
      if (known.has(issue.key) || storefronts.length < serving.length) continue
    }
    const problem = issue.message.slice(`${issue.locale}.json `.length)
    const by = joinApps(storefronts.map(appOf))
    problems.push(`${brand}: ${name}/${issue.locale}.json (${by}, ${issue.locale}): ${problem}`)
  }
  return [...new Set(problems)] // an unreadable file throws once per app
}
