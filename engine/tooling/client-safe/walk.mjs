// The walk a browser bundler makes from a module (TASKS.md 4.2.a), moved here from
// `engine/packages/i18n/test/client-safe.test.ts`, which imports it back. It follows static and
// dynamic imports, relative files and the workspace's own `@engine/*` packages — through their
// `exports`, under the browser conditions — and never a third-party package: those are named,
// not entered. It reads source text, not an AST: `import type` / `export type` are erased and
// skipped; anything else that names a module counts, because a bundler keeps it.
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'

import { dynamicImports } from './scan.mjs'

/** `import …`, `export … from`, a bare `import 'x'`; `import type`/`export type` are erased. */
const STATEMENTS =
  /(?:^|\n)\s*(?:import|export)\s+(type\s+)?(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/g
/** `import('x')`: a bundler splits it into a chunk, which the page still loads. */
const DYNAMIC = /\bimport\s*\(\s*(?:'([^']+)'|"([^"]+)"|`([^`$]+)`)\s*\)/g
/** A browser bundler's conditions; a package's `exports` is read in its own key order. */
export const BROWSER_CONDITIONS = new Set(['browser', 'import', 'module', 'default'])

/** The extensions a bundler resolves an extensionless import to, in its order. */
const CODE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs']
/** `./x.js` in TypeScript source names `./x.ts` (or `.tsx`) under bundler resolution. */
const TS_FOR_JS = { '.js': ['.ts', '.tsx'], '.jsx': ['.tsx'], '.mjs': ['.mts'] }

/** Why a dynamic `import()` of an expression fails the gate (TASKS.md 4.7.a). */
export const UNRESOLVABLE =
  'its argument is not a string, so no walk can tell what it loads — name the module in a string literal'

/**
 * The specifiers a file imports at runtime, each with how: `static` or `dynamic`. A dynamic
 * `import()` of anything but a plain string comes back too, as `{ expression }` — its argument's
 * source, which is also its `specifier` — so the walk reports it rather than skip it.
 */
export function importsOf(file) {
  const source = readFileSync(file, 'utf8')
  const statics = [...source.matchAll(STATEMENTS)]
    .filter(([, typeOnly]) => !typeOnly)
    .map(([, , specifier = '']) => ({ specifier, kind: 'static' }))
  const dynamics = [...source.matchAll(DYNAMIC)].map(([, a, b, c]) => ({
    specifier: a ?? b ?? c ?? '',
    kind: 'dynamic',
  }))
  // The pattern over the raw text stays (it errs toward following); the scan adds what it
  // misses — `import('x', { with: … })` — and every argument that is not a string.
  const unresolved = []
  for (const found of dynamicImports(source)) {
    if ('expression' in found) {
      const { expression } = found
      unresolved.push({ specifier: expression, kind: 'dynamic', expression })
    } else if (!dynamics.some(({ specifier }) => specifier === found.specifier)) {
      dynamics.push({ specifier: found.specifier, kind: 'dynamic' })
    }
  }
  return [...statics, ...dynamics, ...unresolved]
}

/** The specifiers alone, static then dynamic; an `import()` of an expression names none. */
export function specifiersOf(file) {
  return importsOf(file)
    .filter((each) => each.expression === undefined)
    .map(({ specifier }) => specifier)
}

const isFile = (path) => existsSync(path) && statSync(path).isFile()
const isCode = (path) => CODE_EXTENSIONS.includes(extname(path)) && !/\.d\.[mc]?ts$/.test(path)

/**
 * The code file a path names: itself, with an extension, its TypeScript twin, or its folder's
 * `index`. `null` for a file a bundler loads but does not parse as code (CSS, JSON, an image);
 * a throw when nothing is there, so a walk never passes over what it cannot see.
 */
export function moduleFile(path) {
  const ext = extname(path)
  const twins = (TS_FOR_JS[ext] ?? []).map((each) => path.slice(0, -ext.length) + each)
  const candidates = [
    ...(isCode(path) ? [path] : []),
    ...twins,
    ...CODE_EXTENSIONS.map((each) => `${path}${each}`),
    ...CODE_EXTENSIONS.map((each) => join(path, `index${each}`)),
  ]
  const found = candidates.find(isFile)
  if (found) return realpathSync(found)
  if (isFile(path)) return null
  throw new Error(`no module at ${path}`)
}

/** An `exports` value under the browser conditions, `*` filled; `null` when none applies. */
function target(value, star) {
  if (typeof value === 'string') return value.replaceAll('*', star)
  if (value === null || typeof value !== 'object') return null
  for (const [condition, next] of Object.entries(value)) {
    const found = BROWSER_CONDITIONS.has(condition) ? target(next, star) : null
    if (found !== null) return found
  }
  return null
}

/** The `exports` entry for a subpath: exact first, else the longest-prefix `*` pattern. */
function exported(exports, subpath) {
  const map = typeof exports === 'object' && exports !== null ? exports : { '.': exports }
  const keys = Object.keys(map)
  if (keys.every((key) => !key.startsWith('.'))) return { value: subpath === '.' ? map : undefined }
  if (subpath in map) return { value: map[subpath], star: '' }
  const pattern = keys
    .filter((key) => key.includes('*') && subpath.startsWith(key.slice(0, key.indexOf('*'))))
    .sort((a, b) => b.indexOf('*') - a.indexOf('*'))
    .find((key) => subpath.endsWith(key.slice(key.indexOf('*') + 1)))
  if (!pattern) return { value: undefined }
  const star = subpath.slice(
    pattern.indexOf('*'),
    subpath.length - (pattern.length - pattern.indexOf('*') - 1),
  )
  return { value: map[pattern], star }
}

/** A workspace package's file for `@engine/<name>[/<sub>]`, from its `exports`. */
export function resolvePackage(specifier, from) {
  const [scope = '', name = '', ...rest] = specifier.split('/')
  const subpath = rest.length > 0 ? `./${rest.join('/')}` : '.'
  for (let dir = dirname(from); ; dir = dirname(dir)) {
    const root = join(dir, 'node_modules', scope, name)
    if (existsSync(join(root, 'package.json'))) {
      const { exports } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
      const { value, star = '' } = exported(exports, subpath)
      const file = target(value, star)
      if (file === null) throw new Error(`${specifier}: not exported to a browser`)
      const resolved = moduleFile(resolve(root, file))
      if (resolved === null) throw new Error(`${specifier}: exports a file that is not code`)
      return resolved
    }
    if (dirname(dir) === dir) throw new Error(`${specifier}: no package`)
  }
}

/** The file a specifier leads a walk into — `null` for a package the walk only names. */
export function follow(specifier, from) {
  if (specifier.startsWith('.')) return moduleFile(resolve(dirname(from), specifier))
  if (specifier.startsWith('@engine/')) return resolvePackage(specifier, from)
  return null
}

/**
 * Every package specifier a module reaches at runtime, following relative imports and the
 * workspace's own `@engine/*` packages (through their `exports`) all the way down.
 */
export function runtimeReach(entry, seen = new Set()) {
  const reached = new Set()
  if (seen.has(entry)) return reached
  seen.add(entry)
  for (const specifier of specifiersOf(entry)) {
    const next = follow(specifier, entry)
    if (!specifier.startsWith('.')) reached.add(specifier)
    if (next !== null) for (const each of runtimeReach(next, seen)) reached.add(each)
  }
  return reached
}

/** The package specifiers a module imports itself, relative imports followed within its package. */
export function directReach(entry, seen = new Set()) {
  const direct = new Set()
  if (seen.has(entry)) return direct
  seen.add(entry)
  for (const specifier of specifiersOf(entry)) {
    if (!specifier.startsWith('.')) direct.add(specifier)
    else {
      const next = moduleFile(resolve(dirname(entry), specifier))
      if (next !== null) for (const each of directReach(next, seen)) direct.add(each)
    }
  }
  return direct
}

/**
 * Walks from `entry` and returns every place it reaches a specifier `forbidden` names, each with
 * its import chain — the steps from the entry to the import, as `{ file, specifier, kind }` — and
 * the rule's reason. A forbidden `@engine/*` entry is reported, not entered. An import the walk
 * cannot follow is reported too (`reason: null`, `error`): unseen is not safe — a dynamic
 * `import()` of an expression among them, with the `expression` it could not read.
 */
export function findReaches(entry, forbidden) {
  const found = []
  const seen = new Set()
  const visit = (file, chain) => {
    if (seen.has(file)) return
    seen.add(file)
    for (const { specifier, kind, expression } of importsOf(file)) {
      if (expression !== undefined) {
        const step = [...chain, { file, specifier, kind, expression }]
        found.push({ chain: step, specifier, reason: null, error: UNRESOLVABLE, expression })
        continue
      }
      const step = [...chain, { file, specifier, kind }]
      const reason = forbidden(specifier)
      if (reason !== null) {
        found.push({ chain: step, specifier, reason })
        continue
      }
      let next
      try {
        next = follow(specifier, file)
      } catch (error) {
        found.push({ chain: step, specifier, reason: null, error: String(error.message) })
        continue
      }
      if (next !== null) visit(next, step)
    }
  }
  visit(realpathSync(entry), [])
  return found
}
