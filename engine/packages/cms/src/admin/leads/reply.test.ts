/** The reply links on a lead (TASKS.md 10.8.b): number, language, item and nothing priced. */
import { describe, expect, it } from 'vitest'

import { LEADS_COPY } from './copy'
import { buildReply, openingLine } from './reply'

const lead = {
  site: 'gallery',
  payload: { name: 'Ayu', whatsapp: '+62 812-3456-7890', email: 'ayu@example.com', locale: 'en' },
}

describe('buildReply', () => {
  it('rejects a number that is not in international form, rather than guess one', () => {
    expect(buildReply(lead, null).whatsapp).toBeNull()
  })

  it('builds a wa.me link with digits only and the opening line naming the item', () => {
    const reply = buildReply(
      { ...lead, payload: { ...lead.payload, whatsapp: '+6281234567890' } },
      'Map of Java, 1750',
    )
    expect(reply.whatsapp?.startsWith('https://wa.me/6281234567890?text=')).toBe(true)
    const text = decodeURIComponent(reply.whatsapp!.split('text=')[1]!)
    expect(text).toBe(
      'Hello Ayu, this is Indies Gallery. Thank you for asking about "Map of Java, 1750".',
    )
  })

  it('builds a mailto with a subject and the same line', () => {
    const reply = buildReply(lead, 'Map of Java')
    expect(reply.mailto?.startsWith('mailto:ayu@example.com?subject=')).toBe(true)
    expect(decodeURIComponent(reply.mailto!)).toContain('Indies Gallery: Map of Java')
  })

  it('writes in Indonesian for an Indonesian lead and names the shop for a shop lead', () => {
    const reply = buildReply(
      { site: 'shop', payload: { whatsapp: '+6281234567890', locale: 'id' } },
      null,
    )
    expect(reply.language).toBe('id')
    expect(decodeURIComponent(reply.whatsapp!)).toContain('Halo, ini Old East Indies.')
    expect(reply.mailto).toBeNull()
  })

  it('answers nothing for a lead with no contact, and never escapes the item into the URL', () => {
    expect(buildReply({ site: 'gallery', payload: {} }, null)).toMatchObject({
      whatsapp: null,
      mailto: null,
    })
    const nasty = buildReply({ ...lead, payload: { whatsapp: '+6281234567890' } }, 'a&b=c#d')
    expect(nasty.whatsapp!.split('text=')[1]).not.toMatch(/[&#" ]/)
  })

  it('never says a price', () => {
    for (const language of ['en', 'id'] as const) {
      expect(openingLine(language, 'gallery', 'Ayu', 'Map')).not.toMatch(/Rp|\$|price|harga/i)
    }
  })
})

describe('the leads copy', () => {
  it('has both languages for every key, and the inbox no longer shares the list entry name', () => {
    for (const [key, entry] of Object.entries(LEADS_COPY)) {
      expect(entry.en, key).toBeTruthy()
      expect(entry.id, key).toBeTruthy()
    }
    expect(LEADS_COPY.inboxTitle.en).not.toBe('Leads')
    expect(LEADS_COPY.inboxTitle.id).not.toBe('Calon pembeli')
  })
})
