// TASKS.md 5.4.a — the behavioural half of ARCHITECTURE.md §15's fence (condition 3): route
// parity loads every C13 mount under this resolve hook, which refuses `payload`, `@payloadcms/*`
// and `@engine/cms` wherever they are imported, so a static path from a mount to Payload fails CI
// however indirect — through `@engine/loaders`, or any package that depends on cms. A handler's
// `import('./payload-…')` is never evaluated by a load, so the lazy path stays free.
import { relative } from 'node:path'

import { PAYLOAD_SPECIFIER } from './eslint-fences.mjs'

/** The error a refused import raises; `chain` runs from the mount's side to the refused import. */
export class PayloadReachedError extends Error {
  constructor(source, chain) {
    super(`'${source}' refused: ${chain.join(' → ')} → ${source} (ARCHITECTURE.md §15)`)
    this.source = source
    this.chain = chain
  }
}

/**
 * A Vite plugin (`enforce: 'pre'`, ahead of Vite's own resolver) that throws a
 * `PayloadReachedError` for a refused specifier and records every other resolution's importer, so
 * the error can name the whole chain from the first module that was loaded.
 */
export function payloadHook(repoRoot) {
  const parents = new Map()
  const show = (id) => relative(repoRoot, id.split('?')[0]).split('\\').join('/')
  const chainTo = (importer) => {
    const chain = []
    for (let id = importer; id && !chain.includes(show(id)); id = parents.get(id))
      chain.unshift(show(id))
    return chain
  }
  return {
    name: 'route-parity:refuse-payload',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (PAYLOAD_SPECIFIER.test(source)) throw new PayloadReachedError(source, chainTo(importer))
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      if (resolved && importer && !parents.has(resolved.id)) parents.set(resolved.id, importer)
      return resolved
    },
  }
}

/** The `PayloadReachedError` behind a failed load, however Vite wrapped it; `null` for another. */
export function payloadReached(error) {
  for (let cause = error; cause; cause = cause.cause) {
    if (cause instanceof PayloadReachedError) return cause
  }
  const match = /'([^']+)' refused: (.+) → \1 \(ARCHITECTURE\.md §15\)/.exec(String(error?.message))
  return match ? { source: match[1], chain: match[2].split(' → ') } : null
}
