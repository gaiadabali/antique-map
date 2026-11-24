/**
 * `@engine/http/security` — a site's own app's CSP builder and static headers, for its proxy:
 *
 *   createProxy({
 *     app: 'shop',
 *     contentSecurityPolicy: appContentSecurityPolicy('shop'),
 *     securityHeaders: securityHeaders(),
 *   })
 *
 * The builder reads the environment on each request, like the proxy's host list: nothing runs at
 * import. Which policy a path gets is `surfaceOf()`; the policies are `./csp`'s.
 */
import {
  appAdminOrigin,
  appOrigin,
  parsePublicPath,
  SITES,
  type SiteKey,
} from '@engine/config/sites'

import {
  buildCsp,
  MEDIA_FILE_CSP,
  MEDIA_FILE_PATH,
  mediaOriginOf,
  newNonce,
  type CspSurface,
} from './csp'

export * from './csp'
export * from './headers'

type Env = Readonly<Record<string, string | undefined>>

/** Which of the three policies a path on `site` gets. */
export function surfaceOf(site: SiteKey, pathname: string): CspSurface {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin'
  const parsed = parsePublicPath(SITES[site], pathname, new URLSearchParams())
  return parsed.kind === 'surface' && parsed.surface === 'checkout' ? 'checkout' : 'storefront'
}

/**
 * The page preview's origin for one app: its own canonical origin when its admin answers there
 * (`ADMIN_HOST` unset or the canonical host); `null` when the admin has a host of its own — staff
 * cookies would not reach a frame on another host, so no frame is allowed at all.
 */
export function appPreviewOrigin(site: SiteKey, env: Env): string | null {
  const origin = appOrigin(site, env)
  return origin !== null && origin === appAdminOrigin(site, env) ? origin : null
}

/** The builder a site's own app hands `createProxy({ contentSecurityPolicy })`. */
export function appContentSecurityPolicy(site: SiteKey, env: Env = process.env) {
  return (context: { readonly pathname: string }): string => {
    if (MEDIA_FILE_PATH.test(context.pathname)) return MEDIA_FILE_CSP
    const surface = surfaceOf(site, context.pathname)
    return buildCsp(surface, newNonce(), {
      development: env.NODE_ENV !== 'production',
      mediaOrigin: mediaOriginOf(env),
      // The gallery is never framed: only the shop's pages have a preview.
      previewOrigin: site === 'shop' ? appPreviewOrigin(site, env) : null,
      plainHttp: appOrigin(site, env)?.startsWith('http://') === true,
    })
  }
}
