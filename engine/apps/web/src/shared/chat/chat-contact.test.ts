import { describe, expect, it } from 'vitest'

import { talkToPersonLink } from './chat-contact'

const origin = 'https://gallery.example.com'

describe('talkToPersonLink', () => {
  it('prefers WhatsApp and opens it in a new tab', () => {
    const link = talkToPersonLink(
      { whatsappHref: 'https://wa.me/6281234567890', emailHref: 'mailto:hello@example.com' },
      origin,
    )
    expect(link).toEqual({ href: 'https://wa.me/6281234567890', external: true })
  })

  it('falls back to email, which stays in the tab', () => {
    const link = talkToPersonLink(
      { whatsappHref: null, emailHref: 'mailto:hello@example.com' },
      origin,
    )
    expect(link).toEqual({ href: 'mailto:hello@example.com', external: false })
  })

  it('offers nothing when no channel is set or a link is off the allowlist', () => {
    expect(talkToPersonLink({ whatsappHref: null, emailHref: null }, origin)).toBeNull()
    expect(
      talkToPersonLink({ whatsappHref: 'https://evil.example.net/x', emailHref: null }, origin),
    ).toBeNull()
  })
})
