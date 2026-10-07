/**
 * The reply is exactly the schema or nothing (TASKS.md 8.3.a–b): what the model may answer, and
 * what refuses the whole reply.
 */
import { describe, expect, it } from 'vitest'

import { goodReply } from './draft.test-support'
import { DRAFT_REPLY_SCHEMA, parseDraftReply } from './reply'

const parse = (value: unknown) => parseDraftReply(JSON.stringify(value))

describe('the drafting reply (8.3.a)', () => {
  it('takes a reply that is exactly the schema', () => {
    const parsed = parse(goodReply())
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.reply.objectType.value).toBe('map')
      expect(parsed.reply.date).toMatchObject({ precision: 'circa', from: 1726, to: null })
    }
  })

  it('a non-JSON reply is refused', () => {
    expect(parseDraftReply('Sure! Here is the draft: {"title": …}')).toEqual({
      ok: false,
      reason: 'reply: not JSON',
    })
    expect(parseDraftReply('')).toMatchObject({ ok: false })
  })

  it('a reply that sets grade, provenance or a price is refused whole', () => {
    for (const extra of [
      { grade: { value: 'A', confidence: 'high', basis: 'x' } },
      { provenance: [{ holder: 'A collector' }] },
      { askingPrice: 1 },
      { price: 'USD 10' },
    ]) {
      expect(parse(goodReply(extra))).toMatchObject({ ok: false, reason: expect.stringMatching(/unexpected/) })
    }
    // Hidden one level down, too.
    const nested = goodReply({ title: { value: 'X', confidence: 'low', basis: 'x', askingPrice: 5 } })
    expect(parse(nested)).toMatchObject({ ok: false, reason: 'title: unexpected askingPrice' })
  })

  it('refuses a missing field, an unknown object type, a future year and an absurd size', () => {
    const { subjects: _gone, ...missing } = goodReply()
    expect(parse(missing)).toMatchObject({ ok: false })
    expect(parse(goodReply({ objectType: { value: 'spaceship', confidence: 'low', basis: '' } }))).toMatchObject({ ok: false })
    expect(
      parse(goodReply({ date: { precision: 'exact', from: 3020, to: null, confidence: 'low', basis: '' } })),
    ).toMatchObject({ ok: false })
    const huge = goodReply({
      dimensions: { scaleVisible: true, image: { height: 1e9, width: 1 }, sheet: null, confidence: 'low', basis: '' },
    })
    expect(parse(huge)).toMatchObject({ ok: false })
  })

  it('refuses more than six names and a reply too long to be a draft', () => {
    const many = goodReply({ places: { names: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], confidence: 'low', basis: '' } })
    expect(parse(many)).toMatchObject({ ok: false })
    expect(parseDraftReply(`{"title":"${'x'.repeat(30_000)}"}`)).toEqual({ ok: false, reason: 'reply: too long' })
  })

  it('drops a blank name and refuses a name that is not text, so no null reaches the vocabulary', () => {
    const blank = parse(goodReply({ places: { names: ['  ', 'Bali', ''], confidence: 'low', basis: '' } }))
    expect(blank.ok).toBe(true)
    if (blank.ok) expect(blank.reply.places.names).toEqual(['Bali'])
    for (const bad of [null, 7, { name: 'Bali' }, ['Bali']]) {
      const parsed = parse(goodReply({ subjects: { names: [bad], confidence: 'low', basis: '' } }))
      expect(parsed).toMatchObject({ ok: false, reason: 'subjects.names.0: not text' })
    }
  })

  it('sends a schema with no grade, provenance, price, status, stock or location in it', () => {
    const schema = JSON.stringify(DRAFT_REPLY_SCHEMA)
    for (const name of ['grade', 'provenance', 'price', 'askingPrice', 'stock', 'location', 'status']) {
      expect(schema).not.toContain(`"${name}"`)
    }
    expect(DRAFT_REPLY_SCHEMA).toMatchObject({ additionalProperties: false })
  })
})
