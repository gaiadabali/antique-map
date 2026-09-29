/**
 * @contract C13 — the HTTP handler manifest: its vocabulary · owner: ARC · entry: `@engine/http/manifest`
 *
 * The words every part of the manifest shares: methods, lanes, how a caller proves itself, a
 * mounted route, and an operation served at a sub-path of a catch-all route.
 */
import type { ModuleKey } from '@engine/config/schema'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
/**
 * The only methods an HTML form sends. Every operation a page calls — C6's commerce API, the
 * auth and forms routes — uses these alone: a read is a GET, and every write a POST, a change or
 * a removal included. So a form reaches each one without JavaScript (`FORM_RESULT`).
 */
export type FormMethod = Extract<HttpMethod, 'GET' | 'POST'>
export type Lane = 'WEB' | 'DOM' | 'PAY' | 'LOG' | 'MED' | 'SRC' | 'SIS' | 'SEO'

/** How a caller proves itself. The handler enforces it; the manifest makes it reviewable. */
export type RouteAuth =
  | 'public' // anyone: rate-limited where it writes; a guest bag is the hashed-token cart cookie
  | 'customer' // the customer session under its own cookie (ARCHITECTURE.md §12)
  | 'token' // an opaque token: a pay link or quote in its path, an access token in a cookie
  | 'signature' // a provider's signature over the raw body; failure → 401 and an alert
  | 'sister' // a request signed with the sister's shared secret (C12)
  | 'cron' // Authorization: Bearer CRON_SECRET; 503 while it is unset
  | 'revalidate' // Authorization: Bearer REVALIDATE_SECRET
  | 'staff' // a Payload staff session

export type EngineRoute = {
  /** The mount path: the app's folder under `src/app`, in Next.js dynamic-segment syntax. */
  readonly path: string
  /** The `@engine/http` subpath the route file re-exports; `src/<area>/route.ts` in the package. */
  readonly handler: string
  readonly methods: readonly HttpMethod[]
  readonly owner: Lane
  readonly auth: readonly RouteAuth[]
  /**
   * CSRF: a cookie can authenticate a write here, so the handler refuses a non-GET request unless
   * `Origin` is this site's (or `Sec-Fetch-Site: same-origin`). The one exception is RFC 8058's
   * one-click unsubscribe, and only as `ONE_CLICK_UNSUBSCRIBE` states it: its URL's token is its
   * whole credential and it reads no cookie, so a cross-site post can do nothing a cookie allows.
   */
  readonly sameOrigin: boolean
  /** The module whose absence makes the handler answer 404 (the file is mounted regardless). */
  readonly module?: ModuleKey
}

/**
 * One operation at a sub-path of a catch-all route (`/api/x/auth/<path>`): its method, who may
 * call it, and the module without which the handler answers 404.
 */
export type SubRoute = {
  readonly method: FormMethod
  readonly path: string
  readonly auth: readonly RouteAuth[]
  readonly module?: ModuleKey
}

export const GET = ['GET'] as const
export const POST = ['POST'] as const
export const GET_POST = ['GET', 'POST'] as const
