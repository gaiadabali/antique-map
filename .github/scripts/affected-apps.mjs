#!/usr/bin/env node
// Which app's CI jobs a change needs (TASKS.md 24.3.a, PLAN-V2 §4.4): reads the changed paths —
// a JSON array (dorny/paths-filter's `list-files: json`) as the first argument, or one path per
// line on stdin — and prints `web=…`, `shop=…` and `code=…` lines for `$GITHUB_OUTPUT`.
//
//   node .github/scripts/affected-apps.mjs '["engine/apps/shop/src/proxy.ts"]'
//   git diff --name-only main... | node .github/scripts/affected-apps.mjs
//
// The rules, first match wins:
// - docs only (docs/**, manual/**, .claude/**, TASKS.md, any *.md) need neither app: `code=false`,
//   and only the static checks run;
// - engine/apps/<app>/** is that app's;
// - engine/packages/<dir>/** is every app whose workspace dependencies reach that package, read
//   from the package.json files themselves — so while today's app imports @engine/cms-shop and
//   the shop's shared packages import @engine/cms (until phase 26), a change to either CMS runs
//   both apps' jobs, and the filter tightens by itself as those imports go;
// - each app's own e2e and Lighthouse files (`APP_FILES`) are that app's;
// - anything else — engine/tooling, the root config, the lockfile, .github, the shared e2e
//   support — is both: an unknown path is never skipped.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const APPS = ['web', 'shop']

const DOCS = [/^docs\//, /^manual\//, /^\.claude\//, /^TASKS\.md$/, /\.md$/i]

/** Files outside engine/ that belong to one app alone; checked before the "both" fallback. */
const APP_FILES = {
  shop: [
    /^tests\/e2e\/shop-app\//,
    /^playwright\.shop\.config\.ts$/,
    /^lighthouserc\.shop\.json$/,
    /^\.github\/workflows\/shop(-serve)?\.yml$/,
    /^\.github\/scripts\/shop-/,
  ],
  web: [
    // Today's suites; tests/e2e/support and the accounts/harness under admin/ serve both configs.
    /^tests\/e2e\/(?!shop-app\/|support\/|admin\/(accounts\.ts|local\.mjs)$)/,
    /^playwright\.config\.ts$/,
    /^lighthouserc(\.web)?\.json$/,
    /^\.github\/workflows\/e2e\.yml$/,
    /^\.github\/scripts\/e2e-db\.sh$/,
  ],
}

/** Every workspace package under engine/: its directory, its name and its @engine/ deps. */
function workspace(root) {
  const packages = []
  for (const group of ['apps', 'packages']) {
    const base = join(root, 'engine', group)
    if (!existsSync(base)) continue
    for (const dir of readdirSync(base)) {
      const file = join(base, dir, 'package.json')
      if (!existsSync(file)) continue
      const json = JSON.parse(readFileSync(file, 'utf8'))
      const deps = Object.keys({ ...json.dependencies, ...json.devDependencies })
      packages.push({
        path: `engine/${group}/${dir}`,
        name: json.name,
        deps: deps.filter((dep) => dep.startsWith('@engine/')),
      })
    }
  }
  return packages
}

/** For each app, the set of package paths it reaches (itself included). */
export function reach(packages) {
  const byName = new Map(packages.map((each) => [each.name, each]))
  const out = {}
  for (const app of APPS) {
    const start = packages.find((each) => each.path === `engine/apps/${app}`)
    const seen = new Set()
    const stack = start ? [start] : []
    while (stack.length > 0) {
      const next = stack.pop()
      if (seen.has(next.path)) continue
      seen.add(next.path)
      for (const dep of next.deps) if (byName.has(dep)) stack.push(byName.get(dep))
    }
    out[app] = seen
  }
  return out
}

/** The apps one path needs: [] for docs, one or both otherwise. */
export function appsFor(path, reached) {
  if (DOCS.some((rule) => rule.test(path))) return []
  const owner = /^engine\/(apps|packages)\/([^/]+)\//.exec(path)
  if (owner) {
    const dir = `engine/${owner[1]}/${owner[2]}`
    const apps = APPS.filter((app) => reached[app].has(dir))
    // A package no app reaches yet (a new one, before its first import) still runs both.
    return apps.length > 0 ? apps : [...APPS]
  }
  for (const app of APPS) if (APP_FILES[app].some((rule) => rule.test(path))) return [app]
  return [...APPS]
}

/** `{ web, shop, code }` for a list of changed paths. */
export function affected(paths, root = ROOT) {
  const reached = reach(workspace(root))
  const apps = new Set(paths.flatMap((path) => appsFor(path.replace(/\\/g, '/'), reached)))
  const result = Object.fromEntries(APPS.map((app) => [app, apps.has(app)]))
  return { ...result, code: apps.size > 0 }
}

function readInput() {
  const arg = process.argv[2]
  if (arg !== undefined) return JSON.parse(arg)
  return readFileSync(0, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = affected(readInput())
  for (const [key, value] of Object.entries(result)) console.log(`${key}=${value}`)
}
