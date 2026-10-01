// Each storefront app's own `supports` (TASKS.md 4.1.c, 4.7.b): what `engine/apps/<app>/src/
// supports.ts` declares the app can render. `check:brands` and `createBrand` check a brand's
// modules against the app that renders it with these — never with a list of their own — so a
// module an app cannot render fails the scaffold and the gate, not the page (BRANDS.md §6).
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The repository this tool ships in. Its apps are the ones that render a brand, whatever folder
 * a caller checks or scaffolds brands in.
 */
export const ENGINE_REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

/** Every app under `<repoRoot>/engine/apps` with a `src/supports.ts`, sorted by app. */
export function supportsFiles(repoRoot = ENGINE_REPO_ROOT) {
  const apps = join(repoRoot, 'engine', 'apps')
  if (!existsSync(apps)) return []
  return readdirSync(apps, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ app: entry.name, file: join(apps, entry.name, 'src', 'supports.ts') }))
    .filter(({ file }) => existsSync(file))
    .sort((a, b) => a.app.localeCompare(b.app))
}

const isSupports = (value) =>
  typeof value === 'object' &&
  value !== null &&
  typeof value.storefront === 'string' &&
  Array.isArray(value.modules) &&
  value.modules.every((key) => typeof key === 'string')

/**
 * Loads each app's `supports` with `loadModule` (a TypeScript runner's) and keys it by the
 * storefront it declares: `{ supports: { gallery: AppSupports, … }, apps: { gallery: 'gallery' } }`
 * — `apps` names the app folder each came from. Throws on a file with no `supports` export of
 * C1's `AppSupports` shape, or two apps declaring one storefront: either is a gate that cannot
 * say which app renders a brand.
 */
export async function loadSupports(loadModule, repoRoot = ENGINE_REPO_ROOT) {
  const supports = {}
  const apps = {}
  for (const { app, file } of supportsFiles(repoRoot)) {
    const at = `engine/apps/${app}/src/supports.ts`
    const declared = (await loadModule(file))?.supports
    if (!isSupports(declared)) {
      throw new Error(
        `${at} exports no \`supports\` of the AppSupports shape { storefront, modules }`,
      )
    }
    const { storefront, modules } = declared
    if (apps[storefront] !== undefined) {
      throw new Error(
        `${at} and engine/apps/${apps[storefront]} both declare the ${storefront} storefront`,
      )
    }
    supports[storefront] = { storefront, modules: [...modules] }
    apps[storefront] = app
  }
  return { supports, apps }
}
