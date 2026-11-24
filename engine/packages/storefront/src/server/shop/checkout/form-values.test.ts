/**
 * `valuesFromForm` (6-followup-4 #3): the server action echoes these back on a refusal so the
 * buyer's typed contact, address and pin survive React 19's post-action form reset. Pure
 * `FormData` parsing, split out of `actions.ts` (which `import`s `server-only` and so cannot be
 * imported from a test).
 */
import { describe, expect, it } from 'vitest'

import { valuesFromForm } from './form-values'

function formFrom(fields: Record<string, string>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.append(key, value)
  return data
}

describe('valuesFromForm', () => {
  it('a refusal keeps every typed field', () => {
    const values = valuesFromForm(
      formFrom({
        name: 'Made',
        whatsapp: '+62811222333',
        email: 'made@example.com',
        address: 'Jl. Contoh 1',
        notes: 'Blue gate',
        giftNote: 'For Wayan',
        lat: '-8.6705',
        lng: '115.2126',
      }),
    )
    expect(values).toEqual({
      name: 'Made',
      whatsapp: '+62811222333',
      email: 'made@example.com',
      address: 'Jl. Contoh 1',
      notes: 'Blue gate',
      giftNote: 'For Wayan',
      lat: -8.6705,
      lng: 115.2126,
    })
  })

  it('never echoes a price, because none is ever posted to this helper', () => {
    const values = valuesFromForm(formFrom({ name: 'Made' }))
    expect(values).not.toHaveProperty('expectedTotalIdr')
    expect(values).not.toHaveProperty('price')
  })

  it('a missing or blank lat/lng is null, not NaN or zero', () => {
    expect(valuesFromForm(formFrom({})).lat).toBeNull()
    expect(valuesFromForm(formFrom({ lat: '', lng: '  ' })).lat).toBeNull()
    expect(valuesFromForm(formFrom({ lat: '', lng: '  ' })).lng).toBeNull()
    expect(valuesFromForm(formFrom({ lat: 'abc', lng: '115' })).lat).toBeNull()
  })
})
