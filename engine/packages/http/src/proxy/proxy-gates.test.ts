import { fileURLToPath } from 'node:url'

import { loadBrandConfig } from '@engine/config/loader'
import type { ModuleKey } from '@engine/config/schema'
import { describe, expect, it } from 'vitest'

import { createProxy, decideProxy, type DecideOptions, type ProxyConfig } from './route'

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url))
const gallery = loadBrandConfig({
  env: { BRAND: 'test', BRAND_ROOT: './test', TEST_STOREFRONT: 'gallery' },
  cwd: REPO_ROOT,
})
/** The synthetic gallery with modules switched off — their segments kept, as C1 allows. */
const without = (...keys: ModuleKey[]): ProxyConfig => ({
  ...gallery,
  modules: { ...gallery.modules, ...Object.fromEntries(keys.map((key) => [key, false])) },
})
const decide = (
  path: string,
  config: ProxyConfig = gallery,
  headers: Record<string, string> = {},
  options: DecideOptions = {},
) =>
  decideProxy(
    config,
    { url: new URL(path, 'https://shop.example.com'), headers: new Headers(headers) },
    options,
  )

describe('the proxy — a page whose module is off is not found, whatever the route map keeps', () => {
  it('closes a surface, a form kind and an account section whose module is off', () => {
    const cases: [string, ModuleKey, string][] = [
      ['/quote/abc', 'purchase.invoices', '/en/quote/abc'],
      ['/id/cerita/kapal', 'content.journal', '/id/story/kapal'],
      ['/make-an-offer?item=1706', 'purchase.offers', '/en/form/offer?item=1706'],
      ['/my-account/want-lists', 'retention.wantList', '/en/account/wantLists'],
      ['/nl/mijn-account/holds', 'purchase.holds', '/nl/account/holds'],
    ]
    // The gallery launches with no offers, holds or buyer accounts (D50, D54): each case turns
    // its module — and the account area — on, then off again with everything else left on.
    const open: ProxyConfig = {
      ...gallery,
      modules: {
        ...gallery.modules,
        'accounts.buyers': true,
        'purchase.offers': true,
        'purchase.holds': true,
        'retention.wantList': true,
      },
    }
    const closing = (key: ModuleKey): ProxyConfig => ({
      ...open,
      modules: { ...open.modules, [key]: false },
    })
    for (const [path, module, to] of cases) {
      expect(decide(path, open).to, `${path} with ${module} on`).toBe(to)
      expect(decide(path, closing(module)), `${path} with ${module} off`).toMatchObject({
        why: 'not-found',
        to: path.startsWith('/id/')
          ? '/id/not-found'
          : path.startsWith('/nl/')
            ? '/nl/not-found'
            : '/en/not-found',
      })
    }
  })

  it('keeps every other page open', () => {
    const off = without('purchase.invoices')
    // The account area opens with a buyer's account, which the gallery launches without (D54).
    const config: ProxyConfig = { ...off, modules: { ...off.modules, 'accounts.buyers': true } }
    expect(decide('/product/1706', config).why).toBe('surface')
    expect(decide('/my-account/orders', config).to).toBe('/en/account/orders')
  })
})

describe('the proxy — the not-found route (4.1 adds `(site)/[locale]/not-found/page.tsx`)', () => {
  it('rewrites a missing page to its locale’s not-found route', () => {
    expect(decide('/no/such/page').to).toBe('/en/not-found')
    expect(decide('/id/tidak/ada').to).toBe('/id/not-found')
  })

  it('refuses the not-found route itself as internal, in every locale and spelling', () => {
    for (const path of [
      '/not-found',
      '/id/not-found',
      '/nl/not-found',
      '/en/not-found',
      '/not%2Dfound',
      '/NOT-FOUND',
    ]) {
      expect(decide(path), path).toMatchObject({ why: 'not-found' })
      expect(decide(path).to, path).toMatch(/^\/(?:en|id|nl)\/not-found$/)
    }
  })
})

describe('the proxy — request headers a client may not set', () => {
  it('drops both CSP request headers, report-only included, when no builder runs', () => {
    const answer = createProxy({ config: () => gallery })(
      new Request('https://shop.example.com/product/1', {
        headers: {
          'content-security-policy': "script-src 'nonce-forged'",
          'content-security-policy-report-only': "script-src 'nonce-forged'",
        },
      }),
    )
    const forwarded = answer.headers.get('x-middleware-override-headers')?.split(',') ?? []
    expect(forwarded).not.toContain('content-security-policy')
    expect(forwarded).not.toContain('content-security-policy-report-only')
    expect(
      answer.headers.get('x-middleware-request-content-security-policy-report-only'),
    ).toBeNull()
  })

  it('drops a client’s report-only header even when the builder sets the policy', () => {
    const answer = createProxy({
      config: () => gallery,
      contentSecurityPolicy: () => "default-src 'self'",
    })(
      new Request('https://shop.example.com/product/1', {
        headers: { 'content-security-policy-report-only': "script-src 'nonce-forged'" },
      }),
    )
    expect(answer.headers.get('x-middleware-request-content-security-policy')).toBe(
      "default-src 'self'",
    )
    expect(
      answer.headers.get('x-middleware-request-content-security-policy-report-only'),
    ).toBeNull()
  })

  it('reads the admin’s language cookie under Payload’s cookie prefix', () => {
    const english = { 'accept-language': 'en' }
    const chosen = { cookie: 'site-lng=id', 'accept-language': 'id' }
    expect(
      decide('/admin', gallery, chosen, { cookiePrefix: 'site' }).setRequest,
    ).not.toMatchObject(english)
    expect(decide('/admin', gallery, chosen).setRequest).toMatchObject(english) // default prefix: payload
    expect(decide('/admin', gallery, { cookie: 'payload-lng=id' }).setRequest).not.toMatchObject(
      english,
    )
  })
})
