import { describe, expect, it } from 'vitest'

import { chatContact } from './chat-contact'

describe('chatContact', () => {
  it('builds the WhatsApp and email links from the public contact fields', () => {
    expect(
      chatContact({ whatsapp: '+62 812-3456-7890', email: ' hello@example.com ', phone: null }),
    ).toEqual({
      whatsappHref: 'https://wa.me/6281234567890',
      emailHref: 'mailto:hello@example.com',
    })
  })

  it('leaves a channel null when the owner has not set it', () => {
    expect(chatContact({ whatsapp: null, email: '', phone: '+62 361 000 000' })).toEqual({
      whatsappHref: null,
      emailHref: null,
    })
  })
})
