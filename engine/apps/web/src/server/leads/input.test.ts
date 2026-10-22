/**
 * The lead validator alone (TASKS.md 9.1.c; SECURITY.md V1, V4): the caller's context is separate
 * from the visitor's fields, a stray or reserved key refuses the whole input, contacts are
 * normalised by checkout's rules, and consent is the service's own check.
 */
import { describe, expect, it } from 'vitest'

import { parseLeadInput, type LeadContext } from './input'

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

describe('parseLeadInput', () => {
  it('refuses a stray or reserved key (kind, site)', () => {
    expect(parseLeadInput({ ...FIELDS, status: 'closed' }, CONTEXT).ok).toBe(false)
    expect(parseLeadInput({ ...FIELDS, closedAt: '2020-01-01' }, CONTEXT).ok).toBe(false)
    expect(parseLeadInput({ ...FIELDS, partner: 1 }, CONTEXT).ok).toBe(false)
    expect(parseLeadInput({ ...FIELDS, kind: 'sell' }, CONTEXT).ok).toBe(false)
    expect(parseLeadInput({ ...FIELDS, site: 'gallery' }, CONTEXT).ok).toBe(false)
    expect(parseLeadInput({ ...FIELDS, source: 'chat' }, CONTEXT).ok).toBe(false)
    expect(parseLeadInput({ ...FIELDS, consentVersion: 'v2' }, CONTEXT).ok).toBe(false)
  })

  it('trims the fields and rejects a non-object input', () => {
    const parsed = parseLeadInput(
      {
        ...FIELDS,
        name: '  Made  ',
      },
      CONTEXT,
    )
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.value.name).toBe('Made')
    }
    expect(parseLeadInput(null, CONTEXT).ok).toBe(false)
    expect(parseLeadInput('hello', CONTEXT).ok).toBe(false)
  })

  it('wants a name, a message, a WhatsApp in international form and a real email', () => {
    const parsed = parseLeadInput(
      {
        ...FIELDS,
        name: '',
        message: 'x'.repeat(2001),
        whatsapp: '123',
        email: 'not-an-email',
      },
      CONTEXT,
    )
    expect(parsed).toEqual({
      ok: false,
      errors: {
        name: 'lead.error.name',
        message: 'lead.error.message',
        whatsapp: 'lead.error.whatsapp',
        email: 'lead.error.email',
      },
    })
  })

  it('accepts either contact alone, and ignores a preferred channel with no such contact', () => {
    const { whatsapp: _w, ...emailOnly } = FIELDS
    const parsed = parseLeadInput({ ...emailOnly, preferredChannel: 'whatsapp' }, CONTEXT)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.value.preferredChannel).toBeUndefined()
    expect(parseLeadInput({ ...emailOnly, preferredChannel: 'email' }, CONTEXT)).toMatchObject({
      ok: true,
      value: { preferredChannel: 'email' },
    })
  })

  it('a local 0812 number is normalised to +62', () => {
    const parsed = parseLeadInput(
      {
        ...FIELDS,
        whatsapp: '0812 3456 7890',
      },
      CONTEXT,
    )
    expect(parsed).toEqual({
      ok: true,
      value: expect.objectContaining({
        whatsapp: '+6281234567890',
      }),
    })
  })

  it('an email is lower-cased', () => {
    const parsed = parseLeadInput(
      {
        ...FIELDS,
        email: 'Made@VILLA.example',
      },
      CONTEXT,
    )
    expect(parsed).toEqual({
      ok: true,
      value: expect.objectContaining({
        email: 'made@villa.example',
      }),
    })
  })

  it('refuses a locale the collection does not have', () => {
    expect(parseLeadInput({ ...FIELDS, locale: 'fr' }, CONTEXT).ok).toBe(false)
  })

  it('consent must be true, "on", or "true"', () => {
    expect(parseLeadInput({ ...FIELDS, consent: true }, CONTEXT).ok).toBe(true)
    expect(parseLeadInput({ ...FIELDS, consent: 'on' }, CONTEXT).ok).toBe(true)
    expect(parseLeadInput({ ...FIELDS, consent: 'true' }, CONTEXT).ok).toBe(true)
    expect(parseLeadInput({ ...FIELDS, consent: false }, CONTEXT).ok).toBe(false)
    expect(parseLeadInput({ ...FIELDS, consent: '' }, CONTEXT).ok).toBe(false)
    expect(parseLeadInput({ ...FIELDS, consent: 'yes' }, CONTEXT).ok).toBe(false)
  })
})
