/**
 * The partnership form on a real Postgres (TASKS.md 9.1.c): a good post becomes one owner-only
 * `partnership` lead, written through the Local API by the lead service, and the owner's email
 * goes to the address in `site-settings` with no contact detail or message in it.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  startWorksStack,
  server,
} from '../../../../../packages/cms/src/collections/works/works.test-support'

import { payloadLeadMailer, payloadLeadStore } from './adapters'
import { notifyNewLead, type LeadEmail } from './notify'
import type { LeadDeps } from './ports'
import { PostLimiter } from './rate'

import { CONSENT_VERSION, TURNSTILE_FIELD } from '../../sites/shop/partnership/state'
import { handlePartnershipForm } from '../../sites/shop/partnership/submit'

const ENV = {
  GALLERY_HOSTS: 'gallery.test',
  SHOP_HOSTS: 'shop.test',
  ADMIN_HOST: 'shop.test',
}

describe.skipIf(!server)('the partnership form on a real database', () => {
  let stack: Awaited<ReturnType<typeof startWorksStack>>
  const sent: LeadEmail[] = []

  beforeAll(async () => {
    stack = await startWorksStack('web_partnership_test', (config, key) =>
      getPayload({ config, key }),
    )
    // Outside a request a settings save needs a collector for its cache tags (@engine/cache).
    await invalidationBatch().operation((context) =>
      stack.payload.updateGlobal({
        slug: 'site-settings',
        data: { shop: { leadNotifyEmails: ['owner@example.com'] } },
        overrideAccess: true,
        context,
      } as never),
    )
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  function deps(): LeadDeps {
    const limiter = new PostLimiter()
    const mailer = {
      ...payloadLeadMailer(stack.payload, ENV),
      send: async (email: LeadEmail) => {
        sent.push(email)
      },
    }
    return {
      now: () => new Date('2026-10-05T03:00:00.000Z'),
      verifyTurnstile: async () => true,
      allow: (key) => limiter.allow(key, Date.parse('2026-10-05T03:00:00.000Z')),
      store: payloadLeadStore(stack.payload),
      notify: (notice) => notifyNewLead(mailer, notice),
      log: () => undefined,
    }
  }

  const form = new FormData()
  for (const [key, value] of Object.entries({
    name: 'Made Wirawan',
    email: 'made@villa.example',
    whatsapp: '+62 812 3456 7890',
    message: 'Framed maps for three villas in Ubud.',
    consent: 'on',
    locale: 'en',
    [TURNSTILE_FIELD]: 'XXXX.DUMMY.TOKEN.XXXX',
  })) {
    form.set(key, value)
  }

  it('a partnership form creates a new partnership lead', async () => {
    const state = await handlePartnershipForm(deps(), form, '203.0.113.9')
    expect(state.status).toBe('success')

    const found = await stack.api.find({
      collection: 'leads',
      where: { kind: { equals: 'partnership' } },
      overrideAccess: true,
      depth: 0,
    })
    expect(found.docs).toHaveLength(1)
    const lead = found.docs[0] as Record<string, unknown> & { payload: Record<string, unknown> }
    expect(lead).toMatchObject({ kind: 'partnership', site: 'shop', source: 'form', status: 'new' })
    expect(lead.payload).toMatchObject({
      name: 'Made Wirawan',
      whatsapp: '+6281234567890',
      email: 'made@villa.example',
      message: 'Framed maps for three villas in Ubud.',
      locale: 'en',
      consentVersion: CONSENT_VERSION,
    })
    expect(new Date(String(lead.payload.consentAt)).toISOString()).toBe('2026-10-05T03:00:00.000Z')
    // A new lead is not closed: nothing starts the retention clock.
    expect(lead.closedAt ?? null).toBeNull()
  })

  it('emails the address in site-settings, with no contact details or message', async () => {
    expect(sent).toHaveLength(1)
    const mail = sent[0]!
    expect(mail.to).toEqual(['owner@example.com'])
    expect(mail.subject).toBe('New partnership lead — Old East Indies')
    expect(mail.text).toMatch(/https:\/\/shop\.test\/admin\/collections\/leads\/\d+/)
    expect(`${mail.subject}${mail.text}`).not.toMatch(/Wirawan|villa|6281234567890|Ubud/)
  })

  it('the public cannot read or create leads over REST', async () => {
    expect((await stack.rest('GET', '/api/leads')).status).toBe(403)
    const created = await stack.rest('POST', '/api/leads', {
      json: { kind: 'partnership', site: 'shop', source: 'form' },
    })
    expect(created.status).toBe(403)
  })
})
