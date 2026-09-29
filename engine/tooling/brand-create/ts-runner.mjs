// The same headless-Vite "workspace TypeScript runner" `route-parity` uses
// (its file has the fuller explanation) — this tool needs it too, to
// validate a scaffolded config against the real C1 zod schema without a
// build step. Kept as its own small copy rather than a cross-folder import,
// matching this repo's one-tool-one-folder idiom.
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
