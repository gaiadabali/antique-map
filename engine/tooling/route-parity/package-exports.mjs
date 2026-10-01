// qa's 5.4 re-gate, blocker — an engine package's `exports` (or `imports`) condition can hand
// Next a different module than route parity loads: `{"react-server": "./payload-real.ts",
// "default": "./route.ts"}` put Payload in a mount's production chunk past every gate. So:
//
//   - `findExportConditions`: no engine package's `exports`/`imports` uses a condition at all,
//     unless ALLOWED_EXPORT_CONDITIONS names it with the reason (empty today: none does);
//   - `loadConditionalBranches`: every branch an entry names is loaded under the Payload hook
//     all the same, so while an allowed condition exists, no branch of it escapes the check.
//
// The runner also resolves with the conditions Next's route handlers use (`NEXT_ROUTE_CONDITIONS`).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

import { payloadReached } from './payload-hook.mjs'

/**
 * The conditions a Next 16.3 production build (Turbopack, `next build`'s default; `--webpack`
 * opts out, `next/dist/bin/next`) matches when a node-runtime route handler imports an ESM module.
 * From Next's source: route handlers are in the `rsc` layer, "picking up `react-server` export
 * conditions … including app router custom routes" (`next/dist/lib/constants.js`,
 * `WEBPACK_LAYERS_NAMES.reactServerComponents`); that layer resolves with
 * `reactServerConditionNames = ['react-server', ...conditionNames]` where `conditionNames` is the
 * bundler's own defaults, `'...'` (`next/dist/build/webpack-config.js`). Turbopack's defaults live
 * in its Rust binary, so they were measured (5.4 re-gate): with a probe entry per condition in
 * `@engine/http`'s exports and a gallery route importing each, `pnpm build` bundled the
 * `react-server`, `node`, `import`, `module` and `production` branches and the `default` of
 * `require`, `development`, `edge-light`, `worker`, `browser`, `webpack`, `turbopack`,
 * `edge-runtime`, `react-native`, `deno`, `bun` and `types`. (Under `--webpack` the defaults are
 * webpack's `import`, `module`, `webpack`, `production`, `node`: `getResolveDefaults` in
 * `next/dist/compiled/webpack/bundle5.js`. Any condition is refused below, so either way no
 * branch Next could pick goes unloaded.)
 */
export const NEXT_ROUTE_CONDITIONS = ['react-server', 'node', 'import', 'module', 'production']

/**
 * Conditions an engine package may use in `exports`/`imports`, each with the reason:
 * `{ package: '@engine/x', subpath: './y', condition: 'z', why: '…, decided in TASKS.md a.b' }`.
 * Empty: no engine package branches on a condition, so Next and route parity load the same file.
 */
export const ALLOWED_EXPORT_CONDITIONS = []

/** Every `engine/packages/*` with a package.json: `{ name, dir, file, json }`. */
export function readEnginePackages(packagesDir) {
  if (!existsSync(packagesDir)) return []
  return readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(packagesDir, entry.name, 'package.json'))
    .filter((file) => existsSync(file))
    .map((file) => {
      const json = JSON.parse(readFileSync(file, 'utf8'))
      return { name: json.name, dir: dirname(file), file, json }
    })
}

/** Each conditional branch: `{ field, subpath, conditions: [outer, …, inner], target }`. */
export function conditionalBranches(json) {
  const branches = []
  const walk = (field, subpath, value, conditions) => {
    if (Array.isArray(value)) value.forEach((each) => walk(field, subpath, each, conditions))
    else if (value && typeof value === 'object')
      for (const [key, inner] of Object.entries(value)) {
        const isPath = key.startsWith('.') || key.startsWith('#')
        walk(field, isPath ? key : subpath, inner, isPath ? conditions : [...conditions, key])
      }
    else if (typeof value === 'string' && conditions.length > 0)
      branches.push({ field, subpath, conditions, target: value })
  }
  for (const field of ['exports', 'imports']) {
    const value = json[field]
    // `"exports": { "import": … }` with no subpath keys is the `.` entry's conditions.
    const sugar = value && typeof value === 'object' && !Array.isArray(value)
    const bare = sugar && Object.keys(value).every((key) => !/^[.#]/.test(key))
    walk(field, '.', bare ? { '.': value } : value, [])
  }
  return branches
}

/** Every condition an engine package uses that the allowlist does not name, naming its file. */
export function findExportConditions(packages, repoRoot, allowed = ALLOWED_EXPORT_CONDITIONS) {
  const seen = new Set()
  const violations = []
  for (const { name, file, json } of packages) {
    for (const { field, subpath, conditions } of conditionalBranches(json)) {
      for (const condition of conditions) {
        const key = `${file}\0${field}\0${subpath}\0${condition}`
        const ok = allowed.some(
          (a) => a.package === name && a.subpath === subpath && a.condition === condition,
        )
        if (ok || seen.has(key)) continue
        seen.add(key)
        const where = relative(repoRoot, file).split('\\').join('/')
        violations.push({ kind: 'exports-condition', file: where, field, subpath, condition })
      }
    }
  }
  return violations
}

/** The files a target names: itself, or each match of its one `*` (a subpath pattern). */
function targetFiles(dir, target) {
  if (!target.includes('*')) return [join(dir, target)]
  // `./src/*/route.ts` or `./src/*.ts`: `*` is one segment, or a segment's stem.
  const [before, after] = target.split('*')
  const cut = before.lastIndexOf('/') + 1
  const [folder, prefix] = [before.slice(0, cut), before.slice(cut)]
  const base = join(dir, folder)
  if (!existsSync(base)) return []
  return readdirSync(base)
    .filter((name) => name.startsWith(prefix))
    .map((name) =>
      after.startsWith('/') ? `${folder}${name}${after}` : name.endsWith(after) && folder + name,
    )
    .filter((path) => path && existsSync(join(dir, path)))
    .map((path) => join(dir, path))
}

/**
 * Loads every conditional branch of every package but cms (cms is Payload: any branch of it is
 * the gate's to refuse above) with `loadModule`, under the Payload hook. A branch that reaches
 * Payload is `conditional-branch-reached`, naming the package.json, the branch and the chain.
 */
export async function loadConditionalBranches(packages, repoRoot, loadModule) {
  const violations = []
  for (const { name, dir, file, json } of packages) {
    if (name === '@engine/cms') continue
    for (const branch of conditionalBranches(json)) {
      for (const target of targetFiles(dir, branch.target)) {
        try {
          await loadModule(target)
        } catch (error) {
          const reached = payloadReached(error)
          if (!reached) continue // a branch that fails for another reason is not this gate's
          const where = relative(repoRoot, file).split('\\').join('/')
          violations.push({
            kind: 'conditional-branch-reached',
            file: where,
            ...branch,
            ...reached,
            chain: reached.chain.filter((id) => id !== 'index.html'),
          })
        }
      }
    }
  }
  return violations
}
