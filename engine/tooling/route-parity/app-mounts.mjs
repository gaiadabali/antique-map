// Per-app checks (C13, ARCHITECTURE.md §11): every engine route mounted by
// every storefront app, and each app's `proxy.ts` matcher literal equal to
// `PROXY_MATCHER`. Both need the app's `src/` tree, which phase 4 (the app
// shells) has not scaffolded yet — so both degrade explicitly until then.
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

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
 * Checks one app's mounts against `routes`: a missing file per route, and,
 * for a file that exists, a method mismatch against what it exports.
 * `loadModule` is `withTsRunner`'s loader.
 */
export async function checkAppMounts(appDir, routes, loadModule) {
  const missingFiles = []
  const methodMismatches = []
  for (const route of routes) {
    const file = routeFileFor(appDir, route.path)
    if (!existsSync(file)) {
      missingFiles.push({ path: route.path, file })
      continue
    }
    const mod = await loadModule(file)
    const present = HTTP_METHODS.filter((m) => typeof mod[m] !== 'undefined')
    const missing = route.methods.filter((m) => !present.includes(m))
    const extra = present.filter((m) => !route.methods.includes(m))
    if (missing.length > 0 || extra.length > 0) {
      methodMismatches.push({ path: route.path, file, missing, extra })
    }
  }
  return { missingFiles, methodMismatches }
}

/** The literal `config.matcher` an app's `src/proxy.ts` declares, or `null` if the file does not exist. */
export async function readProxyMatcher(appDir, loadModule) {
  const file = join(appDir, 'src', 'proxy.ts')
  if (!existsSync(file)) return null
  const mod = await loadModule(file)
  return mod.config?.matcher ?? null
}
