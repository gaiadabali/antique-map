// TASKS.md 5.4.b — the static half of how engine routes reach Payload (ARCHITECTURE.md §15,
// condition 3); route parity's resolve hook (`./payload-hook.mjs`) is the behavioural half.
// ESLint rules only: `eslint.config.mjs` names the files each one covers. Each rule is its own
// name, so no scope's options replace another's (a flat config keeps a rule's last options).
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

export const problem = (found, schema = []) => ({ type: 'problem', messages: { found }, schema })
export const report = (context, node, data) => context.report({ node, messageId: 'found', data })

/** A specifier's text: `'x'`, or a template with no `${}`; `null` for anything computed. */
const literal = (node) =>
  node?.type === 'Literal'
    ? node.value
    : node?.quasis?.length === 1
      ? node.quasis[0].value.cooked
      : null

/**
 * A rule refusing each import, re-export and — unless `lazy` allows it — `import()` whose
 * specifier `banned(source, typeOnly, filename)` names. `typeOnly` is `import type`/`export type`
 * alone: an inline `import { type X }` still loads its module under `verbatimModuleSyntax`
 * (tsconfig.base.json), and `typeof import('x')` is a type, never a load.
 */
export const fence = ({ banned, why, lazy = false }) => ({
  meta: problem(`'{{source}}': ${why}`),
  create(context) {
    const check = (node, typeOnly) => {
      const source = literal(node.source)
      if (typeof source === 'string' && banned(source, typeOnly, context.filename))
        report(context, node, { source })
    }
    return {
      ImportDeclaration: (node) => check(node, node.importKind === 'type'),
      'ExportNamedDeclaration[source]': (node) => check(node, node.exportKind === 'type'),
      ExportAllDeclaration: (node) => check(node, node.exportKind === 'type'),
      ...(!lazy && { ImportExpression: (node) => check(node, false) }),
    }
  },
})

/** `payload`, `@payloadcms/*` and `@engine/cms` — what route parity's hook refuses too. */
export const PAYLOAD_SPECIFIER = /^(?:payload|@engine\/cms)(?:\/|$)|^@payloadcms\//
const HTTP_PACKAGE = /^@engine\/http(?:\/|$)/
const CACHE_DIR = join(repoRoot, 'engine', 'packages', 'cache')
const outOfCache = (source, file) =>
  source.startsWith('.') && relative(CACHE_DIR, resolve(dirname(file), source)).startsWith('..')

const WHY = 'ARCHITECTURE.md §15'

/** The package fences of ARCHITECTURE.md §15, by rule name. */
export const PAYLOAD_FENCES = {
  'payload-by-value': fence({
    banned: (source, typeOnly) => PAYLOAD_SPECIFIER.test(source) && !typeOnly,
    why: `under http/src only a payload-*.ts module imports Payload by value, statically or by import(); \`import type\` is free (${WHY}).`,
  }),
  'payload-module-static': fence({
    lazy: true,
    banned: (source, typeOnly) => /^\.(?:.*\/)?payload-[^/]*$/.test(source) && !typeOnly,
    why: `a payload-*.ts module is loaded by import() once the request is read; only a test imports one statically (${WHY}).`,
  }),
  'cms-no-http': fence({
    banned: (source) => HTTP_PACKAGE.test(source),
    why: `@engine/cms never imports @engine/http; invalidation lives in @engine/cache (${WHY}).`,
  }),
  'http-no-loaders': fence({
    banned: (source) => /^@engine\/loaders(?:\/|$)/.test(source),
    why: `content reaches a handler through its own payload-*.ts module, never @engine/loaders (${WHY}).`,
  }),
  'loaders-http-manifest-only': fence({
    banned: (source) => HTTP_PACKAGE.test(source) && source !== '@engine/http/manifest',
    why: `the loaders import nothing of @engine/http but @engine/http/manifest (${WHY}).`,
  }),
  'manifest-types-only': fence({
    banned: (source, typeOnly) => !source.startsWith('.') && !typeOnly,
    why: 'the manifest (C13) imports other packages as types only, its tests excepted.',
  }),
  'cache-leaf': fence({
    banned: (source, typeOnly, file) =>
      outOfCache(source, file) ||
      (source.startsWith('@engine/') && !(typeOnly && /^@engine\/config(?:\/|$)/.test(source))),
    why: `@engine/cache is a leaf: no engine package but C1 (@engine/config), and that as \`import type\` (${WHY}).`,
  }),
}
