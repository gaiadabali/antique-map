// TASKS.md 5.4.a — which module a mount re-exports (C13 `UNBUILT_HANDLER`'s policy): a mount at
// `path` names `handlerOf(path)`, or — only while that handler has no module — the placeholder
// `unbuiltHandlerOf(path)`; and every app names the same one. Read from the mount's text, so a
// mount is judged before anything loads it.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const COMMENTS = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g
const FROM = /\bfrom\s*(['"])([^'"]+)\1/g

/** Every module specifier a mount's `import … from`/`export … from` names, comments stripped. */
export function mountSpecifiers(file) {
  const code = readFileSync(file, 'utf8').replace(COMMENTS, '')
  return [...new Set([...code.matchAll(FROM)].map((match) => match[2]))]
}

/** The module `@engine/http/<area>` resolves to (`@engine/http`'s `./*` export: `src/<area>/route.ts`). */
export function handlerFile(httpSrcDir, specifier) {
  const area = specifier.replace(/^@engine\/http\//, '')
  return join(httpSrcDir, ...area.split('/'), 'route.ts')
}

/**
 * The specifier violations of one mount: `specifiers` (what the file names) against the manifest's
 * `handlerOf(path)` and `unbuiltHandlerOf(path)`. `wrong-specifier` names anything else (and a
 * mount that re-exports nothing); `placeholder-with-handler` a placeholder whose handler exists;
 * `missing-handler` a handler named before its module exists.
 */
export function judgeSpecifiers({ app, path, file, specifiers, handler, placeholder, httpSrcDir }) {
  const where = { app, path, file }
  const handlerExists = existsSync(handlerFile(httpSrcDir, handler))
  if (specifiers.length !== 1 || ![handler, placeholder].includes(specifiers[0])) {
    return [
      { kind: 'wrong-specifier', ...where, expected: [handler, placeholder], actual: specifiers },
    ]
  }
  if (specifiers[0] === placeholder && handlerExists) {
    return [{ kind: 'placeholder-with-handler', ...where, placeholder, handler }]
  }
  if (specifiers[0] === handler && !handlerExists) {
    return [{ kind: 'missing-handler', ...where, handler }]
  }
  return []
}

/** Routes whose mounts name different specifiers in different apps: `{ path, byApp }`. */
export function findSpecifierMismatches(byPath) {
  return [...byPath]
    .filter(([, byApp]) => new Set(Object.values(byApp).map((s) => s.join(','))).size > 1)
    .map(([path, byApp]) => ({ kind: 'specifier-mismatch', path, byApp }))
}
