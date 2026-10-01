// TASKS.md 5.4.a — the behavioural half of ARCHITECTURE.md §15's fence (condition 3): route
// parity loads every C13 mount refusing `payload`, `@payloadcms/*` and `@engine/cms`, so a static
// path from a mount to Payload fails CI however indirect. Two layers (qa's 5.4 gate, B1):
//
//   - this Vite plugin, for every module Vite transforms: it refuses by specifier and by the id
//     the specifier resolves to — a relative path into cms, a `#` subpath import, a symlink;
//   - `./payload-guard.mjs`, for every module Node loads itself: Vite externalises a bare import
//     it can resolve into node_modules (`payload` from an app or cms) and never shows it to a
//     plugin, so Node's ESM hook and CommonJS resolver (`require`, `createRequire`) refuse there.
//
// A handler's `import('./payload-…')` is never evaluated by a load, so the lazy path stays free.
import { relative } from 'node:path'

import { refusalMessage, refusedId, REFUSED, PAYLOAD_SPECIFIER } from './refusal.mjs'

/**
 * A Vite plugin (`enforce: 'pre'`, ahead of Vite's own resolver) that throws a refusal for a
 * refused specifier or resolved id, naming the chain of importers that led to it (each module's
 * first importer, recorded as it resolves).
 */
export function payloadHook(repoRoot) {
  const parents = new Map()
  const show = (id) => relative(repoRoot, id.split('?')[0]).split('\\').join('/')
  const chainTo = (importer) => {
    const chain = []
    for (let id = importer; id && !chain.includes(show(id)); id = parents.get(id))
      chain.unshift(show(id))
    return chain.join(' → ')
  }
  return {
    name: 'route-parity:refuse-payload',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (PAYLOAD_SPECIFIER.test(source))
        throw new Error(refusalMessage(source, null, chainTo(importer)))
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      if (resolved && refusedId(resolved.id))
        throw new Error(refusalMessage(source, resolved.id, chainTo(importer)))
      if (resolved && importer && !parents.has(resolved.id)) parents.set(resolved.id, importer)
      return resolved
    },
  }
}

const MESSAGE = new RegExp(
  `${REFUSED} '([^']+)'(?: \\(([^)]+)\\))?(?: from (.+?))? \\(ARCHITECTURE`,
)

/** `{ source, resolved, chain }` of the refusal behind a failed load, however wrapped; else `null`. */
export function payloadReached(error) {
  for (let cause = error; cause; cause = cause.cause) {
    const match = MESSAGE.exec(String(cause?.message ?? cause))
    if (match) {
      const [, source, resolved = null, from = ''] = match
      return { source, resolved, chain: from ? from.split(' → ') : [] }
    }
  }
  return null
}
