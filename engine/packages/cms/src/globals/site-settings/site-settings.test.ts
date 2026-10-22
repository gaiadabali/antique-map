import { describe, expect, it } from 'vitest'

import { SiteSettings } from '.'

describe('site-settings', () => {
  it('has a bilingual label', () => {
    expect(SiteSettings.label).toMatchObject({ en: expect.any(String), id: expect.any(String) })
  })
})
