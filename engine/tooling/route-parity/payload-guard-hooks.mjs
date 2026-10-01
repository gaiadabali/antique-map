// TASKS.md 5.4.a (qa's 5.4 gate, B1) — Node's ESM resolve hook, on the loader thread
// (`module.register`, Node >= 20.6). Vite externalises a bare import it can resolve into
// node_modules and loads it with Node's own `import()`, past every Vite plugin; this hook sees
// that import and everything it imports in turn. It refuses only while `payload-guard.mjs` has
// raised the shared flag, so nothing else in the process is affected.
import { refusalMessage, refusedId, PAYLOAD_SPECIFIER } from './refusal.mjs'

let active = new Int32Array(1)

export function initialize({ flag }) {
  active = flag
}

export async function resolve(specifier, context, nextResolve) {
  if (Atomics.load(active, 0) === 1 && PAYLOAD_SPECIFIER.test(specifier))
    throw new Error(refusalMessage(specifier, null, context.parentURL))
  const resolved = await nextResolve(specifier, context)
  if (Atomics.load(active, 0) === 1 && refusedId(resolved.url))
    throw new Error(refusalMessage(specifier, resolved.url, context.parentURL))
  return resolved
}
