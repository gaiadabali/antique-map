// The same headless-Vite "workspace TypeScript runner" `route-parity` uses (its file has the
// fuller explanation): this gate loads each app's `supports.ts` and `@engine/config/validate`
// with it, so the plain-Node CLI runs the real C1 rules against the apps' real declarations with
// no build step and no new dependency. Kept as its own small copy, as `brand-create` keeps one.
import { createServer } from 'vite'

export async function withTsRunner(repoRoot, fn) {
  const server = await createServer({
    configFile: false,
    root: repoRoot,
    logLevel: 'silent',
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true },
  })
  try {
    return await fn((absPath) => server.ssrLoadModule(absPath))
  } finally {
    await server.close()
  }
}
