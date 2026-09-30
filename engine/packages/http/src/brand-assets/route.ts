/**
 * `/brand-assets/[...path]` — `@engine/http/brand-assets` (C13, TASKS.md 4.1.f): the brand's
 * logo, marks, favicon, touch icon, web manifest, OG base and licensed fonts, served at runtime
 * from the brand folder shipped beside the build (`BRAND_ROOT`), because `public/` and
 * `next/font` are one build's and a build serves several brands (BRANDS.md §2). Each app mounts
 * it with one line — `export { GET } from '@engine/http/brand-assets'` — and the proxy rewrites
 * the root files (`/favicon.ico`, `/apple-touch-icon.png`, `/site.webmanifest`) here (C13
 * `ROOT_REWRITES`). `brandAssetUrl()` mints the versioned URL the shell links.
 */
import { resolveBrandPaths } from '@engine/config/loader'

import { notFound, serveBrandAsset } from './serve'

export { brandAssetUrl } from './version'

type Context = { readonly params: Promise<{ path: string[] }> }

let assetsDir: string | undefined

/** The process's brand folder, found once: the brand is fixed for the life of a process. */
function brandAssetsDir(): string | null {
  try {
    return (assetsDir ??= resolveBrandPaths().assetsDir)
  } catch {
    return null // no brand: nothing to serve (the boot check refuses such a process anyway)
  }
}

export async function GET(request: Request, context: Context): Promise<Response> {
  const dir = brandAssetsDir()
  if (dir === null) return notFound()
  const { path } = await context.params
  return serveBrandAsset({
    assetsDir: dir,
    segments: path,
    url: new URL(request.url),
    headers: request.headers,
  })
}
