/**
 * One build serves every brand on this storefront (BRANDS.md §2): nothing here may name a
 * brand, read `BRAND`, or bake a brand's value in — the brand is runtime config, read from
 * `BRAND` / `BRAND_ROOT` per process (DEPLOYMENT.md §8). No `NEXT_PUBLIC_*`, no `headers()` CSP
 * (the proxy builds it per request, ARCHITECTURE.md §13), no route segment config anywhere
 * (Cache Components rejects it, ARCHITECTURE.md §9).
 *
 * The build touches no database (CONVENTIONS.md §12): `output: 'standalone'` is assembled into
 * the deploy artifact by `.github/scripts/assemble-artifact.sh`.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

/** The workspace root: standalone output traces the engine packages from here. */
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

const nextConfig: NextConfig = {
  output: 'standalone',
  cacheComponents: true,
  outputFileTracingRoot: workspaceRoot,
  turbopack: { root: workspaceRoot },
  // The engine's packages ship as TypeScript source (their exports maps point at src/).
  transpilePackages: [
    '@engine/cms',
    '@engine/config',
    '@engine/http',
    '@engine/i18n',
    '@engine/view-models',
  ],
  // Every request renders in full at request time, never from a prerendered shell resumed under
  // the build's 200: Next 16.3 serves a Cache Components route's shell — even an empty one — with
  // the status it had at build, so a page's `notFound()` or `permanentRedirect()` could only reach
  // the HTML as a meta tag. Next bypasses the shell for an "HTML-limited bot"; all user agents are
  // one here (the 4.1.e spike, ARCHITECTURE.md §9). Metadata renders in the <head>, never streamed.
  htmlLimitedBots: /.*/,
  poweredByHeader: false,
  // `next dev` writes no AGENTS.md/CLAUDE.md into the app: the repository root's own carry the
  // rules, and an untracked pair per app is noise in every worktree (TASKS.md 5.6.d, gate F5).
  agentRules: false,
  reactStrictMode: true,
}

const withAdmin = withPayload(nextConfig, { devBundleServerPackages: false })
const payloadHeaders = withAdmin.headers

/**
 * `withPayload` sends `Accept-CH`, `Critical-CH` and `Vary: Sec-CH-Prefers-Color-Scheme` on every
 * path (`/:path*`) for the admin's colour theme. On the storefront `Critical-CH` makes Chromium
 * request every first visit twice, and the `Vary` splits each `immutable` brand asset in a shared
 * cache (4.1 reviews: senior-fe #3, senior-be #11). The admin keeps them; nothing else gets them.
 */
export default {
  ...withAdmin,
  headers: async () =>
    ((await payloadHeaders?.()) ?? []).map((rule) =>
      rule.source === '/:path*' ? { ...rule, source: '/admin/:path*' } : rule,
    ),
} satisfies NextConfig
