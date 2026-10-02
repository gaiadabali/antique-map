/**
 * `leads` access on a real Postgres (TASKS.md 3.4.b): the collection refuses a lead without a kind,
 * and only the owner reads or writes leads over REST. Editors, store staff and the public see
 * nothing.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { startWorksStack, server } from '../works/works.test-support'

describe.skipIf(!server)('leads: access on a real database', () => {
  let stack: Awaited<ReturnType<typeof startWorksStack>>
  const origin = 'http://shop.localhost:4170'

  beforeAll(async () => {
    process.env.SITE_URL = origin
    process.env.GALLERY_HOSTS = 'gallery.localhost'
    process.env.SHOP_HOSTS = 'shop.localhost'
    process.env.PORT = '4170'
    stack = await startWorksStack('cms_leads_access_test', (config, key) =>
      getPayload({ config, key }),
    )
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const lead = () => ({
    kind: 'ask',
    site: 'gallery',
    source: 'form',
    payload: { name: 'A', whatsapp: '+6281234567890' },
  })

  it('refuses a lead without a kind', async () => {
    const response = await stack.rest('POST', '/api/leads', {
      role: 'owner',
      json: { site: 'gallery', source: 'form' },
    })
    expect(response.status).toBe(400)
    const body = (await response.json()) as { errors?: unknown[] }
    expect(body.errors?.length).toBeGreaterThan(0)
  })

  it('only the owner reads leads; editors, stores and the public are refused', async () => {
    const created = await stack.rest('POST', '/api/leads', {
      role: 'owner',
      json: lead(),
    })
    if (created.status !== 201) {
      const body = (await created.json()) as { errors?: Array<{ path: string; message: string }> }
      console.log('DEBUG create lead body:', JSON.stringify(body, null, 2))
    }
    expect(created.status).toBe(201)
    const { doc } = (await created.json()) as { doc: { id: number } }

    expect((await stack.rest('GET', `/api/leads/${doc.id}`, { role: 'owner' })).status).toBe(200)
    expect((await stack.rest('GET', '/api/leads?limit=100', { role: 'owner' })).status).toBe(200)
    expect((await stack.rest('GET', `/api/leads/${doc.id}`, { role: 'editor' })).status).toBe(403)
    expect((await stack.rest('GET', '/api/leads?limit=100', { role: 'editor' })).status).toBe(403)
    expect((await stack.rest('GET', `/api/leads/${doc.id}`, { role: 'store' })).status).toBe(403)
    expect((await stack.rest('GET', '/api/leads?limit=100', { role: 'store' })).status).toBe(403)
    expect((await stack.rest('GET', `/api/leads/${doc.id}`)).status).toBe(403)
    expect((await stack.rest('GET', '/api/leads?limit=100')).status).toBe(403)
  })
})
