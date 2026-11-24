import { describe, expect, it } from 'vitest'

import { CreatePartnerButton } from './create-partner-button'

describe('Create partner is absent once a partner is linked', () => {
  it('renders nothing once the lead already has a partner', () => {
    const element = CreatePartnerButton({
      data: { kind: 'partnership', partner: 7 },
      id: 1,
      i18n: { language: 'en' },
    })
    expect(element).toBeNull()
  })

  it('renders nothing for a lead that is not a partnership lead', () => {
    const element = CreatePartnerButton({
      data: { kind: 'ask', partner: null },
      id: 1,
      i18n: { language: 'en' },
    })
    expect(element).toBeNull()
  })

  it('renders the button on an unlinked partnership lead', () => {
    const element = CreatePartnerButton({
      data: { kind: 'partnership', partner: null },
      id: 1,
      i18n: { language: 'en' },
    })
    expect(element).not.toBeNull()
  })
})
