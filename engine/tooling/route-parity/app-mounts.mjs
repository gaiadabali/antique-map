// Per-app checks (C13, ARCHITECTURE.md §11): every engine route mounted by
// every storefront app, and each app's `proxy.ts` matcher literal equal to
// `PROXY_MATCHER`. Both need the app's `src/` tree, which phase 4 (the app
// shells) has not scaffolded yet — so both degrade explicitly until then.
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { engineChain, payloadReached } from './payload-hook.mjs'
import { judgeSpecifiers, mountSpecifiers } from './specifiers.mjs'

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

/** Every `<appsDir>/*` folder that has a `src/app` tree (Next has been scaffolded there). */
export function discoverScaffoldedApps(repoRoot, appsDir = join(repoRoot, 'engine', 'apps')) {
  if (!existsSync(appsDir)) return []
  return readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(appsDir, name, 'src', 'app')))
    .sort()
}

/** The Next.js route file a mount `path` (already in Next's own bracket syntax) expects, under `appDir`. */
export function routeFileFor(appDir, mountPath) {
  return join(appDir, 'src', 'app', ...mountPath.split('/').filter(Boolean), 'route.ts')
}

/**
 * Checks one app's mounts against `routes`: a missing file per route; for a file that exists, the
 * specifier it re-exports (`judgeSpecifiers`, 5.4.a), then — loaded by `loadModule`
 * (`withTsRunner`'s, under the Payload hook) — whether the load reached Payload or failed, and a
 * method mismatch against what it exports. `names` is `{ app, handlerOf, unbuiltHandlerOf,
 * httpSrcDir, appsPrefix }` (`appsPrefix`: the apps folder as a chain names it, `engineChain`);
 * `specifiers` maps each mounted path to what the file names.
 */
export async function checkAppMounts(appDir, routes, loadModule, names) {
  const { app, handlerOf, unbuiltHandlerOf, httpSrcDir, appsPrefix } = names
  const missingFiles = []
  const methodMismatches = []
  const violations = []
  const specifiers = new Map()
  for (const route of routes) {
    const file = routeFileFor(appDir, route.path)
    if (!existsSync(file)) {
      missingFiles.push({ path: route.path, file })
      continue
    }
    const named = mountSpecifiers(file)
    specifiers.set(route.path, named)
    const judged = judgeSpecifiers({
      ...{ app, path: route.path, file, specifiers: named, httpSrcDir },
      ...{ handler: handlerOf(route.path), placeholder: unbuiltHandlerOf(route.path) },
    })
    violations.push(...judged)
    if (judged.some((v) => v.kind === 'missing-handler')) continue // nothing there to load
    let mod
    try {
      mod = await loadModule(file)
    } catch (error) {
      const reached = payloadReached(error)
      // The hook records each module's first importer, which may be the other app's mount.
      const chain = reached && engineChain(reached.chain, appsPrefix)
      violations.push(
        reached
          ? { kind: 'payload-reached', app, path: route.path, file, source: reached.source, chain }
          : { kind: 'mount-load-failed', app, path: route.path, file, error: String(error) },
      )
      continue
    }
    const present = HTTP_METHODS.filter((m) => typeof mod[m] !== 'undefined')
    const missing = route.methods.filter((m) => !present.includes(m))
    const extra = present.filter((m) => !route.methods.includes(m))
    if (missing.length > 0 || extra.length > 0) {
      methodMismatches.push({ path: route.path, file, missing, extra })
    }
  }
  return { missingFiles, methodMismatches, violations, specifiers }
}

/** The literal `config.matcher` an app's `src/proxy.ts` declares, or `null` if the file does not exist. */
export async function readProxyMatcher(appDir, loadModule) {
  const file = join(appDir, 'src', 'proxy.ts')
  if (!existsSync(file)) return null
  const mod = await loadModule(file)
  return mod.config?.matcher ?? null
}
