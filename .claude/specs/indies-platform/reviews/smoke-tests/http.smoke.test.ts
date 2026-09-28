// Scratch smoke test for C13 — never committed.
import { describe, expect, it } from 'vitest'

import {
  COMMERCE_AREAS,
  COMMERCE_OPERATIONS,
  commerceUrl,
  ENGINE_ROUTES,
  handlerOf,
} from '../src/manifest'

describe('C13 manifest', () => {
  it('lists unique paths and handlers', () => {
    const paths = ENGINE_ROUTES.map((r) => r.path)
    expect(new Set(paths).size).toBe(paths.length)
    expect(ENGINE_ROUTES.every((r) => r.path.startsWith('/api/x/') || r.path === '/api/health' || r.path.startsWith('/brand-assets/'))).toBe(true)
    console.log(ENGINE_ROUTES.length, 'routes')
  })
  it('mounts one route per commerce area and addresses every operation inside its area', () => {
    for (const area of Object.keys(COMMERCE_AREAS)) {
      const r = ENGINE_ROUTES.find((x) => x.path === `/api/x/commerce/${area}/[[...path]]`)
      expect(r?.handler).toBe(`@engine/http/commerce/${area}`)
    }
    for (const [op, a] of Object.entries(COMMERCE_OPERATIONS)) {
      const r = ENGINE_ROUTES.find((x) => x.path === `/api/x/commerce/${a.area}/[[...path]]`)
      expect(r?.methods, op).toContain(a.method)
    }
    expect(commerceUrl('cart.addLines')).toBe('/api/x/commerce/cart/lines')
    expect(commerceUrl('shipTo.set')).toBe('/api/x/commerce/destination')
    expect(handlerOf('/api/x/webhooks/payments/[provider]/[seller]')).toBe('@engine/http/webhooks/payments')
    expect(commerceUrl('payment.status')).toBe('/api/x/commerce/payments/status')
    expect(COMMERCE_OPERATIONS['payment.status'].method).toBe('POST')
    expect(COMMERCE_OPERATIONS['payLink.get']).toEqual({ area: 'pay', method: 'GET', path: '' })
    const writesByCookie = ENGINE_ROUTES.filter((r) => r.methods.some((m) => m !== 'GET') && r.auth.some((a) => ['public', 'customer', 'token'].includes(a)))
    expect(writesByCookie.every((r) => r.sameOrigin)).toBe(true)
    expect(ENGINE_ROUTES.filter((r) => r.auth.includes('signature')).every((r) => !r.sameOrigin)).toBe(true)
    // no GET operation takes a credential in its query
    for (const [op, a] of Object.entries(COMMERCE_OPERATIONS)) if (a.method === 'GET') expect(['cart.get', 'payLink.get', 'appointment.slots', 'quote.get'], op).toContain(op)
    // every area method is used by an operation, except orders (document downloads)
    for (const [area, spec] of Object.entries(COMMERCE_AREAS)) {
      for (const m of spec.methods) {
        const used = Object.values(COMMERCE_OPERATIONS).some((o) => o.area === area && o.method === m)
        if (!used) console.log('unused', area, m)
      }
    }
  })
})
