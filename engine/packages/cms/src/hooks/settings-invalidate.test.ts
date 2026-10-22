import { invalidationBatch } from '@engine/cache'
import { describe, expect, it } from 'vitest'

import { invalidateSettingsOnChange } from './settings-invalidate'

describe('a site-settings save expires both sites’ settings tags, after the commit', () => {
  it('hands settings:gallery and settings:shop to the collector — never revalidating on the spot', async () => {
    const batch = invalidationBatch()
    await batch.operation((context) =>
      invalidateSettingsOnChange({ doc: { shop: {} }, previousDoc: {}, context } as never),
    )
    expect([...batch.pending].sort()).toEqual(['settings:gallery', 'settings:shop'])
  })

  it('returns the saved document unchanged', async () => {
    const doc = { shop: { contact: { whatsapp: '+6281100000000' } } }
    const batch = invalidationBatch()
    let returned: unknown
    await batch.operation((context) => {
      returned = invalidateSettingsOnChange({ doc, previousDoc: {}, context } as never)
    })
    expect(returned).toBe(doc)
  })
})
