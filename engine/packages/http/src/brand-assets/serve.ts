/**
 * The answer to one `/brand-assets/…` request (C13 `BRAND_ASSET_URL`, TASKS.md 4.1.f), decided
 * from the brand's assets folder and the request alone, so it is tested without Next.
 *
 * - `immutable` for a year only when `?v=` is the file's current version; with no `v` (a root
 *   file such as `/favicon.ico`, whose public URL never changes) or a stale one, five minutes and
 *   a strong `ETag` — the full SHA-256 — answered 304 on a matching `If-None-Match`.
 * - Every answer `X-Content-Type-Options: nosniff`, with the type C1 names for the extension. An SVG
 *   opened directly runs no script and loads nothing (`default-src 'none'`), may keep its own
 *   `<style>` — exported logos carry one — and gets an opaque origin (`sandbox`), GitHub's
 *   user-content policy (senior-be #10). As an `<img>`, a browser applies neither.
 * - Anything that is not a listed file inside the folder, or cannot be read, is a 404 (`./resolve`,
 *   `./read`), cached by nobody: a file the brand ships later must not be hidden behind a
 *   remembered miss.
 */
import { notFound } from '../legacy/respond'
import { BRAND_ASSET_URL } from '../manifest'
import { readAsset } from './read'
import { resolveBrandAsset } from './resolve'

export type BrandAssetRequest = {
  /** The brand's `site/assets/` folder (`resolveBrandPaths().assetsDir`). */
  readonly assetsDir: string
  /** The route's `[...path]`, as Next decoded it. */
  readonly segments: readonly string[]
  readonly url: URL
  readonly headers: Headers
}

export const SVG_POLICY = "default-src 'none'; style-src 'unsafe-inline'; sandbox"

export function serveBrandAsset(request: BrandAssetRequest): Response {
  const asset = resolveBrandAsset(request.assetsDir, request.segments)
  const content = asset === null ? null : readAsset(asset.file)
  if (asset === null || content === null) return notFound()
  const etag = `"${content.sha256}"`
  const versioned = request.url.searchParams.get(BRAND_ASSET_URL.version.param) === content.version
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'Content-Type': asset.contentType,
    'Cache-Control': versioned
      ? BRAND_ASSET_URL.cacheControl.versioned
      : BRAND_ASSET_URL.cacheControl.unversioned,
    ETag: etag,
    ...(asset.isSvg ? { 'Content-Security-Policy': SVG_POLICY } : {}),
  }
  if (matches(request.headers.get('if-none-match'), etag)) {
    return new Response(null, { status: 304, headers })
  }
  headers['Content-Length'] = String(content.body.byteLength)
  return new Response(content.body, { status: 200, headers })
}

/** RFC 9110 §13.1.2: `*`, or any listed tag equal to ours (a weak `W/` form compares weakly). */
function matches(ifNoneMatch: string | null, etag: string): boolean {
  if (ifNoneMatch === null) return false
  return ifNoneMatch
    .split(',')
    .map((tag) => tag.trim())
    .some((tag) => tag === '*' || tag === etag || tag === `W/${etag}`)
}
