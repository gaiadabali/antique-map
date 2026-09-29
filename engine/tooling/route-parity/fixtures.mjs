// Fixture writers shared by the route-parity tests: a manifest, an app tree
// and a CMS package, each in a sandbox — never the real repository's files.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** A tiny fixture manifest — three routes, one deliberately shadowing `graphql`. */
export function writeFixtureManifest(
  dir,
  { includeShadowingRoute = false, matcher = ['/((?!api/).*)'], extraRoutes = [] } = {},
) {
  mkdirSync(dir, { recursive: true })
  const routes = [
    "{ path: '/api/health', handler: '@engine/http/health', methods: ['GET'] }",
    "{ path: '/api/x/commerce/cart/[[...path]]', handler: '@engine/http/commerce/cart', methods: ['GET', 'POST'] }",
  ]
  if (includeShadowingRoute) {
    routes.push(
      "{ path: '/api/graphql/[...path]', handler: '@engine/http/graphql', methods: ['GET'] }",
    )
  }
  routes.push(...extraRoutes)
  const file = join(dir, 'manifest.ts')
  writeFileSync(
    file,
    `export const ENGINE_ROUTES = [${routes.join(', ')}]\n` +
      `export const PROXY_MATCHER = ${JSON.stringify(matcher)}\n`,
  )
  return file
}

/** A fixture `engine/packages/cms`: `built` slugs as collection files, `frozen` as the registry's list. */
export function writeFixtureCms(root, { built = [], frozen, registryText } = {}) {
  const src = join(root, 'engine', 'packages', 'cms', 'src')
  for (const slug of built) {
    mkdirSync(join(src, 'collections', slug), { recursive: true })
    writeFileSync(
      join(src, 'collections', slug, 'index.ts'),
      `export const C = { slug: '${slug}' }\n`,
    )
  }
  if (frozen || registryText) {
    mkdirSync(join(src, 'registries'), { recursive: true })
    const list = (frozen ?? []).map((slug) => `  '${slug}',`).join('\n')
    const text = registryText ?? `export const COLLECTION_SLUGS = [\n${list}\n] as const\n`
    writeFileSync(join(src, 'registries', 'collections.ts'), text)
  }
}

export function writeFixtureApp(
  appsDir,
  name,
  { mountedRoutes = [], matcher = ['/((?!api/).*)'], noProxy = false } = {},
) {
  const appDir = join(appsDir, name)
  for (const { path, exports } of mountedRoutes) {
    const routeFile = join(appDir, 'src', 'app', ...path.split('/').filter(Boolean), 'route.ts')
    mkdirSync(join(routeFile, '..'), { recursive: true })
    writeFileSync(
      routeFile,
      exports.map((m) => `export const ${m} = () => new Response('ok')`).join('\n') + '\n',
    )
  }
  mkdirSync(join(appDir, 'src', 'app'), { recursive: true }) // ensures discoverScaffoldedApps sees it even with 0 routes
  if (!noProxy) {
    writeFileSync(
      join(appDir, 'src', 'proxy.ts'),
      `export const config = ${JSON.stringify({ matcher })}\n`,
    )
  }
  return appDir
}
