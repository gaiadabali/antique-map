/**
 * `partners` access on a real Postgres (TASKS.md 3.4.b): only the owner reads or writes partners.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { startWorksStack, server, type Role } from '../works/works.test-support'

describe.skipIf(!server)('partners: access on a real database', () => {
  let stack: Awaited<ReturnType<typeof startWorksStack>>

  beforeAll(async () => {
    stack = await startWorksStack('cms_partners_access_test', (config, key) =>
      getPayload({ config, key }),
    )
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const partner = () => ({
    name: 'Bali Art Partners',
    kind: 'hotel',
    site: 'gallery',
    contact: { whatsapp: '+6281234567890' },
    status: 'active',
  })

  it('only the owner reads partners; editors, stores and the public are refused', async () => {
    const created = await stack.rest('POST', '/api/partners', {
      role: 'owner',
      json: partner(),
    })
    expect(created.status).toBe(201)
    const { doc } = (await created.json()) as { doc: { id: number } }

    for (const role of ['owner'] as const) {
      expect((await stack.rest('GET', `/api/partners/${doc.id}`, { role })).status).toBe(200)
      expect((await stack.rest('GET', '/api/partners?limit=100', { role })).status).toBe(200)
    }
    for (const role of ['editor', 'store'] as Role[]) {
      expect((await stack.rest('GET', `/api/partners/${doc.id}`, { role })).status).toBe(403)
      expect((await stack.rest('GET', '/api/partners?limit=100', { role })).status).toBe(403)
    }
    expect((await stack.rest('GET', `/api/partners/${doc.id}`)).status).toBe(403)
    expect((await stack.rest('GET', '/api/partners?limit=100')).status).toBe(403)
  })
})
