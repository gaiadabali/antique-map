// Moved from .claude/specs/indies-platform/reviews/smoke-tests/http.smoke.test.ts
// into the package it tests (TASKS.md 2.2.j), so `pnpm test` runs it.
import { describe, expect, it } from 'vitest'

import { ENGINE_ROUTES, handlerOf } from '../src/manifest'

describe('the engine routes manifest', () => {
  it('lists unique paths and handlers', () => {
    const paths = ENGINE_ROUTES.map((r) => r.path)
    expect(new Set(paths).size).toBe(paths.length)
    expect(
      ENGINE_ROUTES.every((r) => r.path.startsWith('/api/x/') || r.path === '/api/health'),
    ).toBe(true)
    expect(ENGINE_ROUTES.every((r) => r.handler === handlerOf(r.path))).toBe(true)
  })
  it('refuses a cross-site write a cookie could authenticate, never a bearer', () => {
    const writesByCookie = ENGINE_ROUTES.filter(
      (r) =>
        r.methods.some((m) => m !== 'GET') &&
        r.auth.some((a) => ['public', 'customer', 'token'].includes(a)),
    )
    expect(writesByCookie.every((r) => r.sameOrigin)).toBe(true)
    expect(
      ENGINE_ROUTES.filter((r) => r.auth.includes('cron') || r.auth.includes('revalidate')).every(
        (r) => !r.sameOrigin,
      ),
    ).toBe(true)
  })
})
