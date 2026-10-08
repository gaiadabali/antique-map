/** Health first: `/api/health` is 200 and `status: ok` on both staging hosts. */
import { expect, test } from '@playwright/test'

import { GALLERY, SHOP } from './support'

for (const [name, origin] of [
  ['gallery', GALLERY],
  ['shop', SHOP],
] as const) {
  test(`${name}: /api/health is 200 and ok`, async ({ request }) => {
    const res = await request.get(`${origin}/api/health`)
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { status: string; checks: Record<string, { ok: boolean }> }
    expect(body.status).toBe('ok')
    for (const [check, result] of Object.entries(body.checks)) {
      expect(result.ok, `health check ${check}`).toBe(true)
    }
    console.log(`${name} health: ${JSON.stringify(body)}`)
  })
}
