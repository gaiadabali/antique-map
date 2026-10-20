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

  it('a partner sign-in keeps only a hash, which no one reads back — the owner included', async () => {
    const created = await stack.rest('POST', '/api/partners', {
      role: 'owner',
      json: {
        ...partner(),
        name: 'Signed-in partner',
        signIn: {
          enabled: true,
          email: 'Trade@Example.test',
          newPassword: 'a long enough passphrase',
        },
      },
    })
    expect(created.status).toBe(201)
    const { doc } = (await created.json()) as { doc: { id: number } }
    const read = await stack.rest('GET', `/api/partners/${doc.id}`, { role: 'owner' })
    const body = (await read.json()) as { signIn?: Record<string, unknown> }
    expect(body.signIn?.email).toBe('trade@example.test')
    expect(body.signIn).not.toHaveProperty('passwordHash')
    expect(body.signIn).not.toHaveProperty('newPassword')
    expect(JSON.stringify(body)).not.toContain('passphrase')
    expect(JSON.stringify(body)).not.toContain('scrypt$')

    const weak = await stack.rest('PATCH', `/api/partners/${doc.id}`, {
      role: 'owner',
      json: { signIn: { newPassword: 'short' } },
    })
    expect(weak.status).toBe(400)
  })
})
