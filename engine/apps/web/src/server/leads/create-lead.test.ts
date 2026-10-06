/**
 * The lead service against doubles (TASKS.md 9.1.c): Turnstile first and failing closed, the
 * per-address limit, the one validator's field errors, a lead that survives a failed email, and an
 * email that carries no contact details and no message.
 */
import { describe, expect, it } from 'vitest'

import { createLead, type LeadRequest } from './create-lead'
import type { LeadContext } from './input'
import { newLeadSubjectAndText, notifyNewLead, type LeadEmail, type LeadMailer } from './notify'
import type { LeadDeps, NewLeadNotice, NewLeadRecord } from './ports'
import { PostLimiter } from './rate'

const FIELDS = {
  name: 'Made Wirawan',
  whatsapp: '+62 812-3456 7890',
  email: 'made@villa.example',
  message: 'We run three villas in Ubud and want framed maps for every suite.',
  locale: 'en',
  consent: 'on',
} as const

const CONTEXT: LeadContext = {
  kind: 'partnership',
  site: 'shop',
  source: 'form',
  consentVersion: 'partnership-1',
}

type Doubles = {
  deps: LeadDeps
  created: NewLeadRecord[]
  notices: NewLeadNotice[]
  logs: string[]
  turnstile: { calls: number; pass: boolean; throws: boolean }
  failMail: { on: boolean }
}

function doubles(): Doubles {
  const created: NewLeadRecord[] = []
  const notices: NewLeadNotice[] = []
  const logs: string[] = []
  const turnstile = { calls: 0, pass: true, throws: false }
  const failMail = { on: false }
  const limiter = new PostLimiter()
  const deps: LeadDeps = {
    now: () => new Date('2026-10-05T03:00:00.000Z'),
    verifyTurnstile: async () => {
      turnstile.calls += 1
      if (turnstile.throws) throw new Error('network')
      return turnstile.pass
    },
    allow: (key) => limiter.allow(key, Date.parse('2026-10-05T03:00:00.000Z')),
    store: {
      create: async (lead) => {
        created.push(lead)
        return { id: created.length }
      },
    },
    notify: async (notice) => {
      if (failMail.on) throw new Error('smtp down')
      notices.push(notice)
    },
    log: (message) => logs.push(message),
  }
  return { deps, created, notices, logs, turnstile, failMail }
}

const request = (over: Partial<LeadRequest> = {}): LeadRequest => ({
  input: FIELDS,
  context: CONTEXT,
  turnstileToken: 'token-abc',
  ip: '203.0.113.9',
  ...over,
})

describe('createLead', () => {
  it('stores the validated lead, stamps the consent time, and tells the owner', async () => {
    const d = doubles()
    const result = await createLead(d.deps, request())
    expect(result).toEqual({ ok: true, id: 1 })
    expect(d.created).toHaveLength(1)
    expect(d.created[0]).toMatchObject({
      kind: 'partnership',
      site: 'shop',
      source: 'form',
      whatsapp: '+6281234567890',
      consentVersion: 'partnership-1',
      consentAt: '2026-10-05T03:00:00.000Z',
    })
    expect(d.notices).toEqual([{ id: 1, kind: 'partnership', site: 'shop' }])
  })

  it('a failed Turnstile check creates nothing', async () => {
    const d = doubles()
    d.turnstile.pass = false
    expect(await createLead(d.deps, request())).toEqual({ ok: false, reason: 'challenge' })
    d.turnstile.throws = true
    expect(await createLead(d.deps, request())).toEqual({ ok: false, reason: 'challenge' })
    expect(await createLead(d.deps, request({ turnstileToken: null }))).toEqual({
      ok: false,
      reason: 'challenge',
    })
    expect(await createLead(d.deps, request({ turnstileToken: '' }))).toEqual({
      ok: false,
      reason: 'challenge',
    })
    expect(d.created).toHaveLength(0)
    expect(d.notices).toHaveLength(0)
  })

  it('does not even call Turnstile for a missing token', async () => {
    const d = doubles()
    await createLead(d.deps, request({ turnstileToken: null }))
    expect(d.turnstile.calls).toBe(0)
  })

  it('the eleventh post in a minute from one address is refused', async () => {
    const d = doubles()
    for (let i = 0; i < 10; i += 1) {
      expect((await createLead(d.deps, request())).ok).toBe(true)
    }
    expect(await createLead(d.deps, request())).toEqual({ ok: false, reason: 'rate' })
    expect(d.created).toHaveLength(10)
    // Another address is its own allowance.
    expect((await createLead(d.deps, request({ ip: '203.0.113.10' }))).ok).toBe(true)
  })

  it('a failed challenge still counts against the limit, so the eleventh post is refused before siteverify', async () => {
    const d = doubles()
    d.turnstile.pass = false
    for (let i = 0; i < 10; i += 1) {
      expect((await createLead(d.deps, request())).ok).toBe(false)
    }
    // The eleventh call must not even call verifyTurnstile.
    const turnstileCalls = d.turnstile.calls
    expect(await createLead(d.deps, request())).toEqual({ ok: false, reason: 'rate' })
    expect(d.turnstile.calls).toBe(turnstileCalls)
  })

  it('a lead without WhatsApp or email is refused with field errors', async () => {
    const d = doubles()
    const { whatsapp: _w, email: _e, ...bare } = FIELDS
    const result = await createLead(d.deps, request({ input: bare }))
    expect(result).toEqual({
      ok: false,
      reason: 'invalid',
      errors: { contact: 'lead.error.contact' },
    })
    expect(d.created).toHaveLength(0)
  })

  it('a failed email still keeps the lead', async () => {
    const d = doubles()
    d.failMail.on = true
    expect(await createLead(d.deps, request())).toEqual({ ok: true, id: 1 })
    expect(d.created).toHaveLength(1)
    expect(d.logs.join('\n')).toContain('was not sent')
    // The log names the lead, never its contact details or its words.
    expect(d.logs.join('\n')).not.toMatch(/villa|made@|\+62/)
  })

  it('answers unavailable, not a throw, when the store fails', async () => {
    const d = doubles()
    d.deps.store.create = async () => {
      throw new Error('connection refused for made@villa.example')
    }
    expect(await createLead(d.deps, request())).toEqual({ ok: false, reason: 'unavailable' })
    expect(d.logs.join('\n')).not.toContain('made@')
  })
})

describe('the new-lead email', () => {
  const mailer = (sent: LeadEmail[], to: string[] = ['owner@example.com']): LeadMailer => ({
    recipients: async () => to,
    send: async (email) => {
      sent.push(email)
    },
    adminOrigin: 'https://admin.example.com',
    log: () => undefined,
  })

  it('the new-lead email carries no contact details or message', async () => {
    const sent: LeadEmail[] = []
    await notifyNewLead(mailer(sent), { id: 42, kind: 'partnership', site: 'shop' })
    expect(sent).toHaveLength(1)
    const mail = sent[0]!
    expect(mail.to).toEqual(['owner@example.com'])
    expect(mail.subject).toBe('New partnership lead — Old East Indies')
    expect(mail.text).toContain('https://admin.example.com/admin/collections/leads/42')
    const everything = `${mail.subject}\n${mail.text}`
    for (const secret of [FIELDS.name, FIELDS.email, '6281234567890', '812', 'villas', 'suite']) {
      expect(everything).not.toContain(secret)
    }
  })

  it('has no field to carry them: the notice is the kind, the site and the id', () => {
    const { subject, text } = newLeadSubjectAndText(
      // Even a notice with extra properties cannot leak them into the mail.
      { id: 7, kind: 'ask', site: 'gallery', name: 'Ayu', message: 'secret' } as NewLeadNotice,
      null,
    )
    expect(`${subject}${text}`).not.toMatch(/Ayu|secret/)
    expect(text).toContain('ADMIN_HOST is not set')
  })

  it('logs a marked placeholder and sends nothing when no address is configured', async () => {
    const sent: LeadEmail[] = []
    const logs: string[] = []
    const m = { ...mailer(sent, []), log: (message: string) => logs.push(message) }
    await notifyNewLead(m, { id: 3, kind: 'contact', site: 'gallery' })
    expect(sent).toHaveLength(0)
    expect(logs[0]).toContain('PLACEHOLDER')
  })
})

describe('PostLimiter', () => {
  it('opens a fresh minute after the window', () => {
    const limiter = new PostLimiter(2)
    expect(limiter.allow('a', 0)).toBe(true)
    expect(limiter.allow('a', 1)).toBe(true)
    expect(limiter.allow('a', 2)).toBe(false)
    expect(limiter.allow('a', 60_000)).toBe(true)
  })
})
