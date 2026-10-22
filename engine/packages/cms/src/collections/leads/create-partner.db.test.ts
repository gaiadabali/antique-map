/**
 * `POST /api/leads/:id/create-partner` on a real Postgres (TASKS.md 9.1.b): owner only, copies the
 * contact onto a new partner, links the lead, and refuses a lead that already has one.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { server, startStaffStack, type StaffStack } from '../users/staff.test-support'

describe.skipIf(!server)('create-partner endpoint, on a real database', () => {
  let stack: StaffStack

  beforeAll(async () => {
    stack = await startStaffStack('cms_create_partner_test', (config, key) =>
      getPayload({ config, key }),
    )
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const makeLead = () =>
    stack.payload.create({
      collection: 'leads',
      data: {
        kind: 'partnership',
        site: 'shop',
        source: 'form',
        payload: {
          name: 'Warung Bu Made',
          whatsapp: '+6281234567890',
          email: 'bumade@example.com',
        },
      } as never,
    }) as unknown as Promise<{ id: number }>

  it('copies the contact and links the lead', async () => {
    const lead = await makeLead()
    const response = await stack.rest('POST', `/api/leads/${lead.id}/create-partner`, {
      as: 'owner',
    })
    expect(response.status).toBe(303)

    const updated = (await stack.payload.findByID({
      collection: 'leads',
      id: lead.id,
      depth: 0,
    })) as unknown as { partner: number }
    expect(updated.partner).toBeTruthy()

    const partner = (await stack.payload.findByID({
      collection: 'partners',
      id: updated.partner,
      depth: 0,
    })) as unknown as {
      name: string
      site: string
      status: string
      contact: { person?: string; whatsapp?: string; email?: string }
    }
    expect(partner.name).toBe('Warung Bu Made')
    expect(partner.site).toBe('shop')
    expect(partner.status).toBe('prospect')
    expect(partner.contact.whatsapp).toBe('+6281234567890')
    expect(partner.contact.email).toBe('bumade@example.com')
  })

  it('refuses a lead that already has a partner', async () => {
    const lead = await makeLead()
    const first = await stack.rest('POST', `/api/leads/${lead.id}/create-partner`, { as: 'owner' })
    expect(first.status).toBe(303)
    const second = await stack.rest('POST', `/api/leads/${lead.id}/create-partner`, { as: 'owner' })
    expect(second.status).toBe(400)
  })

  it('refuses anyone but the owner', async () => {
    const lead = await makeLead()
    const editor = await stack.rest('POST', `/api/leads/${lead.id}/create-partner`, {
      as: 'editor',
    })
    expect(editor.status).toBe(403)
    const store = await stack.rest('POST', `/api/leads/${lead.id}/create-partner`, { as: 'store' })
    expect(store.status).toBe(403)
  })
})
