// TASKS.md 5.4.a (qa's 5.4 gate, B1) — the process-wide half of route parity's Payload fence.
// The Vite plugin (`./payload-hook.mjs`) sees only the modules Vite transforms; a bare import
// Vite can resolve into node_modules is externalised and loaded by Node itself. So while a check
// runs, Node's own resolvers refuse Payload too: the ESM hook (`./payload-guard-hooks.mjs`,
// registered once per process) and a wrap of CommonJS's `Module._resolveFilename`, which
// `require()` and `createRequire(…)(…)` go through. Both test by specifier and by resolved file.
import Module, { register } from 'node:module'

import { refusalMessage, refusedId, PAYLOAD_SPECIFIER } from './refusal.mjs'

const KEY = Symbol.for('route-parity:payload-guard')

/** The shared flag (one per process), registering the hooks the first time. */
function install() {
  if (globalThis[KEY]) return globalThis[KEY]
  const flag = new Int32Array(new SharedArrayBuffer(4))
  register('./payload-guard-hooks.mjs', import.meta.url, { data: { flag } })
  const resolveFilename = Module._resolveFilename
  Module._resolveFilename = function (request, parent, ...rest) {
    const guarded = Atomics.load(flag, 0) === 1
    if (guarded && PAYLOAD_SPECIFIER.test(request))
      throw new Error(refusalMessage(request, null, parent?.filename))
    const resolved = resolveFilename.call(this, request, parent, ...rest)
    if (guarded && refusedId(resolved))
      throw new Error(refusalMessage(request, resolved, parent?.filename))
    return resolved
  }
  globalThis[KEY] = flag
  return flag
}

/** Runs `fn()` with Node's resolvers refusing Payload; the guard is lowered again however it ends. */
export async function withPayloadGuard(fn) {
  const flag = install()
  Atomics.store(flag, 0, 1)
  try {
    return await fn()
  } finally {
    Atomics.store(flag, 0, 0)
  }
}
