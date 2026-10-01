// TASKS.md 5.4.a (qa's 5.4 gate, B1) — what route parity's load refuses, by specifier and by the
// module it resolves to. Shared by the Vite plugin (`./payload-hook.mjs`), Node's ESM hooks
// (`./payload-guard-hooks.mjs`, which run on their own thread) and the CommonJS resolver patch
// (`./payload-guard.mjs`), so every path into a module applies the same test.

/** `payload`, `@payloadcms/*` and `@engine/cms` as written in an import. */
export const PAYLOAD_SPECIFIER = /^(?:payload|@engine\/cms)(?:\/|$)|^@payloadcms\//

/**
 * A resolved module inside cms (reached by a relative path, a `#` subpath import or a symlink as
 * surely as by `@engine/cms`) or inside an installed copy of `payload` or `@payloadcms/*`, flat
 * or in pnpm's store (`node_modules/.pnpm/payload@…`, `node_modules/.pnpm/@payloadcms+next@…`).
 */
const PAYLOAD_ID =
  /\/engine\/packages\/cms\/|\/node_modules\/(?:\.pnpm\/)?(?:payload|@payloadcms)(?:[/@+]|$)/

/** A file path or `file:` URL, with forward slashes and no query, decoded. */
function normalise(id) {
  let path = String(id).split('?')[0]
  if (path.startsWith('file:')) path = decodeURIComponent(new URL(path).pathname)
  return path.split('\\').join('/')
}

export const refusedId = (id) => id != null && PAYLOAD_ID.test(normalise(id))

/** The marker every refusal's message carries, so a wrapped error is still recognised. */
export const REFUSED = 'route parity refused'

/** The message of a refusal: what was imported, what it resolved to, and from where. */
export function refusalMessage(source, resolved, importer) {
  const to = resolved && normalise(resolved) !== source ? ` (${normalise(resolved)})` : ''
  const from = importer ? ` from ${normalise(importer)}` : ''
  return `${REFUSED} '${source}'${to}${from} (ARCHITECTURE.md §15)`
}
