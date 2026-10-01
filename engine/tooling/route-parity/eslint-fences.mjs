// TASKS.md 5.4.b — the static half of how engine routes reach Payload (ARCHITECTURE.md §15,
// condition 3); route parity's load (`./payload-hook.mjs`, `./payload-guard.mjs`) is the
// behavioural half. ESLint rules only: `eslint.config.mjs` names the files each one covers. Each
// rule is its own name, so no scope's options replace another's (a flat config keeps a rule's
// last options).
import { existsSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { PAYLOAD_SPECIFIER } from './refusal.mjs'
import { requireArgument, staticString } from './static-string.mjs'

export { PAYLOAD_SPECIFIER }

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

export const problem = (found, schema = []) => ({ type: 'problem', messages: { found }, schema })
export const report = (context, node, data) => context.report({ node, messageId: 'found', data })

const posix = (path) => path.split('\\').join('/')
const PACKAGE_FILE = /^engine\/packages\/([^/]+)(?:\/(.*))?$/
/** `src/revalidate/route.ts` → `revalidate`: the subpath an `exports` map would name it by. */
const subpathOf = (rest = '') =>
  rest
    .replace(/^src(?:\/|$)/, '')
    .replace(/\.[cm]?[jt]sx?$/, '')
    .replace(/(?:^|\/)(?:route|index)$/, '')

/**
 * What an import reaches, as a fence judges it (qa's 5.4 gate, S2). A bare specifier is itself. A
 * relative one that stays inside the importer's package is itself (it starts with `.`). One that
 * leaves it is named as if it had used the package's name — `../../http/src/revalidate/route`
 * from cms is `@engine/http/revalidate` — or, outside every engine package, `payload` for an
 * installed Payload and `<repo>/<path>` for anything else. So a fence cannot be walked around by
 * spelling the path out, as a relative, absolute or `file:` path or a `#` subpath import.
 */
export function reachedBy(source, filename) {
  const path = pathOf(source, filename)
  if (path === null) return source
  if (typeof path === 'object') return reachedBy(path.specifier, filename) // a `#` alias of one
  const target = posix(relative(repoRoot, path))
  const own = PACKAGE_FILE.exec(posix(relative(repoRoot, filename)))?.[1]
  const [, pkg, rest] = PACKAGE_FILE.exec(target) ?? []
  if (pkg !== undefined && pkg === own && source.startsWith('.')) return source
  if (pkg !== undefined && pkg === own) return `./${posix(relative(dirname(filename), path))}`
  if (pkg !== undefined) return ['@engine', pkg, subpathOf(rest)].filter(Boolean).join('/')
  if (/(?:^|\/)node_modules\/(?:\.pnpm\/)?(?:payload|@payloadcms)(?:[/@+]|$)/.test(target))
    return 'payload'
  return `<repo>/${target}`
}

/**
 * The file a specifier names, or `null` for a bare one: a relative or absolute path, a `file:`
 * URL, or a `#` subpath import read from the importer's nearest package.json `imports` (qa's 5.4
 * re-gate, L5) — `{ specifier }` when that maps to a bare specifier.
 */
function pathOf(source, filename) {
  if (source.startsWith('file:')) return fileURLToPath(source)
  if (isAbsolute(source)) return source
  if (source.startsWith('.')) return resolve(dirname(filename), source)
  if (!source.startsWith('#')) return null
  for (let dir = dirname(filename); ; dir = dirname(dir)) {
    const file = join(dir, 'package.json')
    if (existsSync(file)) {
      const imports = JSON.parse(readFileSync(file, 'utf8')).imports ?? {}
      for (const [key, value] of Object.entries(imports)) {
        const [head, tail = ''] = key.split('*')
        const exact = !key.includes('*') && key === source
        const match = key.includes('*') && source.startsWith(head) && source.endsWith(tail)
        if (!exact && !match) continue
        const star = match ? source.slice(head.length, source.length - tail.length) : ''
        const target = firstString(value)?.replace('*', star)
        if (!target) return null
        return target.startsWith('.') ? resolve(dir, target) : { specifier: target }
      }
      return null
    }
    if (dirname(dir) === dir) return null
  }
}

/** The first string leaf of an `imports` value (conditions are refused by route parity). */
const firstString = (value) =>
  typeof value === 'string'
    ? value
    : Array.isArray(value)
      ? value.map(firstString).find(Boolean)
      : value && typeof value === 'object'
        ? Object.values(value).map(firstString).find(Boolean)
        : undefined

/**
 * A rule refusing each import, re-export, `import x = require()`, `require()` and — unless `lazy`
 * allows it — `import()` whose target (`reachedBy`) `banned(target, typeOnly, filename)` names.
 * `typeOnly` is `import type`/`export type` alone: an inline `import { type X }` still loads its
 * module under `verbatimModuleSyntax` (tsconfig.base.json), and `typeof import('x')` is a type.
 */
export const fence = ({ banned, why, lazy = false }) => ({
  meta: problem(`'{{source}}'{{reaches}}: ${why}`),
  create(context) {
    const check = (node, sourceNode, typeOnly) => {
      // A literal, or a name or template that always holds one (`./static-string.mjs`).
      const source = staticString(sourceNode, context)
      if (typeof source !== 'string') return
      const target = reachedBy(source, context.filename)
      if (banned(target, typeOnly, context.filename))
        report(context, node, { source, reaches: target === source ? '' : ` (${target})` })
    }
    return {
      ImportDeclaration: (node) => check(node, node.source, node.importKind === 'type'),
      'ExportNamedDeclaration[source]': (node) =>
        check(node, node.source, node.exportKind === 'type'),
      ExportAllDeclaration: (node) => check(node, node.source, node.exportKind === 'type'),
      TSImportEqualsDeclaration: (node) =>
        node.moduleReference.type === 'TSExternalModuleReference' &&
        check(node, node.moduleReference.expression, node.importKind === 'type'),
      CallExpression: (node) => {
        // `require`, `createRequire(…)`, held, aliased or reassigned; `.call`/`.apply` (qa L4)
        const argument = requireArgument(node, context)
        if (argument) check(node, argument, false)
      },
      ...(!lazy && { ImportExpression: (node) => check(node, node.source, false) }),
    }
  },
})

const HTTP_PACKAGE = /^@engine\/http(?:\/|$)/
const WHY = 'ARCHITECTURE.md §15'

/** The package fences of ARCHITECTURE.md §15, by rule name. */
export const PAYLOAD_FENCES = {
  'payload-by-value': fence({
    banned: (target, typeOnly) => PAYLOAD_SPECIFIER.test(target) && !typeOnly,
    why: `under http/src only a payload-*.ts module imports Payload by value, statically or by import(); \`import type\` is free (${WHY}).`,
  }),
  'payload-module-static': fence({
    lazy: true,
    banned: (target, typeOnly) => /^\.(?:.*\/)?payload-[^/]*$/.test(target) && !typeOnly,
    why: `a payload-*.ts module is loaded by import() once the request is read; only a test imports one statically (${WHY}).`,
  }),
  'cms-no-http': fence({
    banned: (target) => HTTP_PACKAGE.test(target),
    why: `@engine/cms never imports @engine/http; invalidation lives in @engine/cache (${WHY}).`,
  }),
  'http-no-loaders': fence({
    banned: (target) => /^@engine\/loaders(?:\/|$)/.test(target),
    why: `content reaches a handler through its own payload-*.ts module, never @engine/loaders (${WHY}).`,
  }),
  'loaders-http-manifest-only': fence({
    banned: (target) =>
      HTTP_PACKAGE.test(target) && !/^@engine\/http\/manifest(?:\/|$)/.test(target),
    why: `the loaders import nothing of @engine/http but @engine/http/manifest (${WHY}).`,
  }),
  'manifest-types-only': fence({
    banned: (target, typeOnly) => !target.startsWith('.') && !typeOnly,
    why: 'the manifest (C13) imports other packages as types only, its tests excepted.',
  }),
  'cache-leaf': fence({
    banned: (target, typeOnly) =>
      target.startsWith('<repo>/') ||
      (target.startsWith('@engine/') && !(typeOnly && /^@engine\/config(?:\/|$)/.test(target))),
    why: `@engine/cache is a leaf: no engine package but C1 (@engine/config), and that as \`import type\` (${WHY}).`,
  }),
}
