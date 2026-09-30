// `check:brands` (TASKS.md 4.7.b): every committed brand config — each brand folder's
// `site/brand.config.json`, or the synthetic brand's `site/brand.<storefront>.json` — checked
// whole by `validateBrandConfigs()` (C1, `@engine/config/validate`) against the app that renders
// it, with that app's real `engine/apps/<app>/src/supports.ts`. The apps' own `supports.test.ts`
// check the same from inside each app; this is the one gate that sees every brand at once.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

import { ENGINE_REPO_ROOT, loadSupports } from './supports.mjs'
import { withTsRunner } from './ts-runner.mjs'

/**
 * Loads what the gate checks with: `validateBrandConfigs()` and `formatIssue()` from the package
 * entry (resolved the way this workspace package resolves its devDependency) and each app's
 * `supports`, through one headless-Vite TS runner.
 */
export async function loadBrandChecks() {
  const entry = createRequire(import.meta.url).resolve('@engine/config/validate')
  return withTsRunner(ENGINE_REPO_ROOT, async (loadModule) => {
    const { validateBrandConfigs, formatIssue } = await loadModule(entry)
    const { supports, apps } = await loadSupports(loadModule)
    return { validateBrandConfigs, formatIssue, supports, apps }
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
 * test's own). Returns `{ ok, passed, problems, results }`: one `passed` line per clean file,
 * naming the app whose supports it was checked against, and one `problems` line per issue,
 * naming the brand, the file and the field.
 */
export function checkBrands(repoRoot, { validateBrandConfigs, formatIssue, supports, apps = {} }) {
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
  return { ok: report.ok && problems.length === 0, passed, problems, results: report.results }
}
