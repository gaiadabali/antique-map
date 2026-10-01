// `check:brands` (TASKS.md 4.7.b): every committed brand config — each brand folder's
// `site/brand.config.json`, or the synthetic brand's `site/brand.<storefront>.json` — checked
// whole by `validateBrandConfigs()` (C1, `@engine/config/validate`) against the app that renders
// it, with that app's real `engine/apps/<app>/src/supports.ts`. The apps' own `supports.test.ts`
// check the same from inside each app; this is the one gate that sees every brand at once.
// It then checks each brand's copy against the app's message keys (TASKS.md 6.3.e, ./copy.mjs),
// and the synthetic brand's lexicon values against the +30% overflow rule (6.3.m, ./overflow.mjs).
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

import { checkBrandsCopy, loadCopyKeys } from './copy.mjs'
import { checkOverflowCopy, loadLexiconKeys } from './overflow.mjs'
import { ENGINE_REPO_ROOT, loadSupports } from './supports.mjs'
import { withTsRunner } from './ts-runner.mjs'

/** `@engine/i18n/copy`'s source, loaded by path: no tooling package depends on `@engine/i18n`. */
const I18N_COPY = join(ENGINE_REPO_ROOT, 'engine', 'packages', 'i18n', 'src', 'copy.ts')

/**
 * Loads what the gate checks with: `validateBrandConfigs()` and `formatIssue()` from the package
 * entry (resolved the way this workspace package resolves its devDependency), each app's
 * `supports`, `checkCopy()` and each app's copy keys, through one headless-Vite TS runner.
 */
export async function loadBrandChecks() {
  const entry = createRequire(import.meta.url).resolve('@engine/config/validate')
  return withTsRunner(ENGINE_REPO_ROOT, async (loadModule) => {
    const { validateBrandConfigs, formatIssue } = await loadModule(entry)
    const { supports, apps } = await loadSupports(loadModule)
    const { checkCopy } = await loadModule(I18N_COPY)
    const keys = await loadCopyKeys(loadModule, apps)
    const lexicon = await loadLexiconKeys(loadModule, apps)
    return { validateBrandConfigs, formatIssue, supports, apps, checkCopy, keys, lexicon }
  })
}

/** The storefront a config file names, for the line that says which app checked it. */
function storefrontIn(file) {
  try {
    const { storefront } = JSON.parse(readFileSync(file, 'utf8'))
    return typeof storefront === 'string' ? storefront : null
  } catch {
    return null // the validation reports a file that is not JSON; this only labels a line
  }
}

/**
 * Checks every brand config under `repoRoot` with `checks` (from `loadBrandChecks()`, or a
 * test's own), then each clean config's copy folder. Returns `{ ok, passed, problems, results }`:
 * one `passed` line per clean file, naming the app whose supports it was checked against, and
 * one per clean copy folder, naming the app × locales it was checked for; one `problems` line
 * per issue, naming the brand, the file and the field (a copy issue: the app, locale and key).
 */
export function checkBrands(repoRoot, checks) {
  const { validateBrandConfigs, formatIssue, supports, apps = {} } = checks
  const report = validateBrandConfigs({ repoRoot, supports })
  const passed = []
  const problems = report.results.length === 0 ? ['no brand config found (no <brand>/site/)'] : []
  for (const result of report.results) {
    if (result.issues.length > 0) {
      for (const issue of result.issues)
        problems.push(`${result.brand}: ${result.name}: ${formatIssue(issue)}`)
      continue
    }
    const app = apps[storefrontIn(result.file) ?? '']
    const against = app ? `engine/apps/${app}/src/supports.ts` : 'its app’s supports'
    passed.push(`${result.name} (${result.brand}, against ${against})`)
  }
  const copy = checkBrandsCopy(report.results, checks)
  passed.push(...copy.passed.map((line) => `copy ${line}`))
  problems.push(...copy.problems)
  const overflow = checkOverflowCopy(report.results, checks)
  passed.push(...overflow.passed.map((line) => `overflow ${line}`))
  problems.push(...overflow.problems)
  return { ok: report.ok && problems.length === 0, passed, problems, results: report.results }
}
