// Fixture writers shared by the route-parity tests: a manifest, an app tree
// and a CMS package, each in a sandbox — never the real repository's files.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const posix = (path) => path.split('\\').join('/')

/** The real manifest, whose `handlerOf`/`unbuiltHandlerOf` (C13) a fixture manifest re-exports. */
const REAL_MANIFEST = posix(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../packages/http/src/manifest.ts'),
)

/** What a fixture app's mount re-exports by default: the health handler, and cart's placeholder. */
export const FIXTURE_SPECIFIERS = {
  '/api/health': '@engine/http/health',
  '/api/x/commerce/cart/[[...path]]': '@engine/http/unbuilt',
}

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
      `export const PROXY_MATCHER = ${JSON.stringify(matcher)}\n` +
      `export { handlerOf, unbuiltHandlerOf } from '${REAL_MANIFEST}'\n`,
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
  // A mount re-exports `exports` from `from` (FIXTURE_SPECIFIERS' by default); `from: null`
  // defines them in the file instead.
  for (const { path, exports, from = FIXTURE_SPECIFIERS[path] } of mountedRoutes) {
    const routeFile = join(appDir, 'src', 'app', ...path.split('/').filter(Boolean), 'route.ts')
    mkdirSync(join(routeFile, '..'), { recursive: true })
    const inline = exports.map((m) => `export const ${m} = () => new Response('ok')`).join('\n')
    writeFileSync(
      routeFile,
      (from ? `export { ${exports.join(', ')} } from '${from}'` : inline) + '\n',
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

const EVERY_METHOD = "export const GET = () => new Response('ok')\nexport const POST = GET\n"

/**
 * A fixture `@engine/http/src`: `handlers` maps an area to its `route.ts` text (`health` and
 * `unbuilt` by default, each answering GET and POST) and `files` any other module by its path.
 * Returns route parity's options for it: where a handler is looked for, and the alias that
 * resolves `@engine/http/<area>` there, as `@engine/http`'s `./*` export does.
 */
export function writeFixtureHttp(root, { handlers = {}, files = {} } = {}) {
  const httpSrcAbsDir = join(root, 'http-src')
  const areas = { health: EVERY_METHOD, unbuilt: EVERY_METHOD, ...handlers }
  const all = {
    ...files,
    ...Object.fromEntries(Object.entries(areas).map(([area, text]) => [`${area}/route.ts`, text])),
  }
  for (const [path, text] of Object.entries(all)) {
    const file = join(httpSrcAbsDir, ...path.split('/'))
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, text)
  }
  const replacement = `${posix(httpSrcAbsDir)}/$1/route.ts`
  return { httpSrcAbsDir, alias: [{ find: /^@engine\/http\/(.+)$/, replacement }] }
}
