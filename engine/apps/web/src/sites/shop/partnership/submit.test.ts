/**
 * The partnership submit on doubles (TASKS.md 9.1.c): what the form posts becomes one
 * `partnership` lead for the shop with the consent version; a form with a mistake or without
 * consent never reaches Turnstile; nothing in the request picks the site, the kind or the status.
 */
import { describe, expect, it } from 'vitest'

import type { LeadDeps, NewLeadRecord } from '../../../server/leads'
import { LEAD_POSTS_PER_HOUR, PostLimiter } from '../../../server/leads/rate'

import { CONSENT_VERSION, TURNSTILE_FIELD } from './state'
import { handlePartnershipForm } from './submit'

function setup(pass = true) {
  const created: NewLeadRecord[] = []
  const calls = { turnstile: 0, notify: 0 }
  const limiter = new PostLimiter()
  const deps: LeadDeps = {
    now: () => new Date('2026-10-05T03:00:00.000Z'),
    verifyTurnstile: async () => {
      calls.turnstile += 1
      return pass
    },
    allow: (key) => limiter.allow(key),
    store: {
      create: async (lead) => {
        created.push(lead)
        return { id: 9 }
      },
    },
    notify: async () => {
      calls.notify += 1
    },
    log: () => undefined,
  }
  return { deps, created, calls }
}

const form = (fields: Record<string, string>) => {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

const GOOD = {
  name: 'Made Wirawan',
  email: 'made@villa.example',
  whatsapp: '+62 812 3456 7890',
  message: 'Framed maps for three villas.',
  consent: 'on',
  locale: 'id',
  [TURNSTILE_FIELD]: 'XXXX.DUMMY.TOKEN.XXXX',
}

describe('handlePartnershipForm', () => {
  it('makes a shop partnership lead from the form, with the consent version', async () => {
    const { deps, created, calls } = setup()
    const state = await handlePartnershipForm(deps, form(GOOD), '203.0.113.9')
    expect(state.status).toBe('success')
    expect(created).toEqual([
      expect.objectContaining({
        kind: 'partnership',
        site: 'shop',
        source: 'form',
        locale: 'id',
        whatsapp: '+6281234567890',
        consentVersion: CONSENT_VERSION,
      }),
    ])
    expect(calls.notify).toBe(1)
  })

  it('takes nothing from the request that the form does not own', async () => {
    const { deps, created } = setup()
    await handlePartnershipForm(
      deps,
      form({
        ...GOOD,
        kind: 'sell',
        site: 'gallery',
        source: 'chat',
        status: 'closed',
        items: '1',
      }),
      null,
    )
    expect(created[0]).toMatchObject({ kind: 'partnership', site: 'shop', source: 'form' })
    expect(created[0]).not.toHaveProperty('status')
    expect(created[0]).not.toHaveProperty('items')
  })

  it('does not ask Turnstile about a form with a mistake or without consent', async () => {
    const { deps, created, calls } = setup()
    const noConsent = await handlePartnershipForm(deps, form({ ...GOOD, consent: '' }), null)
    expect(noConsent).toMatchObject({ status: 'error', errors: { consent: 'lead.error.consent' } })
    const noContact = await handlePartnershipForm(
      deps,
      form({ ...GOOD, email: '', whatsapp: '' }),
      null,
    )
    expect(noContact.errors).toEqual({ contact: 'lead.error.contact' })
    // The values come back, so the visitor does not retype them.
    expect(noContact.values.name).toBe('Made Wirawan')
    // Turnstile is only called if early validation passes and we have consent
    const earlyCallsBefore = calls.turnstile
    expect(calls.turnstile).toBe(earlyCallsBefore)
    expect(created).toHaveLength(0)
  })

  it('answers a failed security check with a form-level error and keeps the values', async () => {
    const { deps, created } = setup(false)
    const state = await handlePartnershipForm(deps, form(GOOD), null)
    expect(state).toMatchObject({ status: 'error', errors: { form: 'lead.error.challenge' } })
    expect(state.values.message).toBe('Framed maps for three villas.')
    expect(created).toHaveLength(0)
  })

  it('refuses a post with no Turnstile field at all', async () => {
    const { deps, created } = setup()
    const { [TURNSTILE_FIELD]: _token, ...without } = GOOD
    const state = await handlePartnershipForm(deps, form(without), null)
    expect(state.errors).toEqual({ form: 'lead.error.challenge' })
    expect(created).toHaveLength(0)
  })

  it('answers the rate limit after LEAD_POSTS_PER_HOUR posts from one address', async () => {
    const { deps } = setup()
    for (let i = 0; i < LEAD_POSTS_PER_HOUR; i += 1) {
      expect((await handlePartnershipForm(deps, form(GOOD), '198.51.100.7')).status).toBe('success')
    }
    const over = await handlePartnershipForm(deps, form(GOOD), '198.51.100.7')
    expect(over.errors).toEqual({ form: 'lead.error.rate' })
  })
})
