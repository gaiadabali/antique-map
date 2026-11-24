/**
 * Old East Indies' app config (PLAN-V2 §3): one site, one CMS (`@engine/cms-shop`), one database.
 * As today's app: no `NEXT_PUBLIC_*`, no `headers()` CSP (the proxy, TASKS.md 23.2, builds it per
 * request), Cache Components on, and the build touches no database (CONVENTIONS.md §12) —
 * `output: 'standalone'` is the deploy artifact (TASKS.md 24.4).
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
  turbopack: {
    root: workspaceRoot,
    // The shared shop code (`@engine/storefront`, `@engine/site`) asks for the app's Payload as
    // `@engine/cms/instance`: here it is cms-shop's, on this app's own database (TASKS.md 23.3).
    resolveAlias: { '@engine/cms/instance': './src/server/cms-instance.ts' },
  },
  // The engine's packages ship as TypeScript source (their exports maps point at src/).
  transpilePackages: [
    '@engine/cache',
    '@engine/chat',
    '@engine/cms-core',
    '@engine/cms-shop',
    '@engine/config',
    '@engine/http',
    '@engine/i18n',
    '@engine/media',
    '@engine/site',
    '@engine/storefront',
    '@engine/ui',
    '@engine/view-models',
  ],
  // One `payload` module per process: the admin's pages and the route handlers share one
  // instance and one copy of Payload's error classes (today's app's 8.6 finding).
  serverExternalPackages: ['payload'],
  // Every request renders in full at request time (today's app's 4.1.e spike).
  htmlLimitedBots: /.*/,
  experimental: { instantInsights: { validationLevel: 'manual-warning' } },
  poweredByHeader: false,
  agentRules: false,
  reactStrictMode: true,
}

const withAdmin = withPayload(nextConfig, { devBundleServerPackages: false })
const payloadHeaders = withAdmin.headers

/**
 * `withPayload`'s client-hint headers (`Accept-CH`, `Critical-CH`, `Vary`) for the admin's colour
 * theme on the admin's paths only, never on the storefront's (today's app's 4.1 reviews).
 */
export default {
  ...withAdmin,
  headers: async () =>
    ((await payloadHeaders?.()) ?? []).map((rule) =>
      rule.source === '/:path*' ? { ...rule, source: '/admin/:path*' } : rule,
    ),
} satisfies NextConfig
