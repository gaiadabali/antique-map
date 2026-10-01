// The "workspace TypeScript runner" the manifest's own doc comment names
// (`engine/packages/http/src/manifest.ts`): a headless Vite server in
// middleware mode, so a plain CLI can `import()` a `.ts` file that uses
// `moduleResolution: "Bundler"` (extensionless relative imports, package
// `exports` maps pointing at `.ts` sources — tsconfig.base.json) without a
// build step. Vite is already a workspace devDependency; this adds no new one.
import { createServer } from 'vite'

/**
 * Runs `fn(loadModule)` against one Vite dev server rooted at `repoRoot`, with
 * `plugins` (route parity's Payload hook), `alias` (a test's fixture handlers) and
 * `conditions` (the export conditions to resolve with) if given,
 * where `loadModule(absPath)` resolves and executes a `.ts`/`.mjs` module
 * (SSR-transformed, not bundled) and returns its exports. The server is
 * always closed, success or failure.
 */
export async function withTsRunner(repoRoot, fn, { plugins = [], alias, conditions } = {}) {
  const server = await createServer({
    configFile: false,
    root: repoRoot,
    logLevel: 'silent',
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true },
    plugins,
    ...(alias && { resolve: { alias } }),
    // Route parity resolves as Next's route handlers do, not with Vite's own SSR defaults.
    ...(conditions && { ssr: { resolve: { conditions, externalConditions: conditions } } }),
  })
  try {
    return await fn((absPath) => server.ssrLoadModule(absPath))
  } finally {
    await server.close()
  }
}
