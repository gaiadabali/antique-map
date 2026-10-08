import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ChatEntries } from './chat-entries'
import type { ChatEntry } from './chat-reducer'

const labels = { whatsapp: 'Continue on WhatsApp', email: 'Send an email' }
const origin = 'https://gallery.example.com'

describe('ChatEntries', () => {
  it("renders the server's WhatsApp link and refuses a link to another domain", () => {
    const entries: ChatEntry[] = [
      {
        kind: 'handoff',
        channel: 'whatsapp',
        href: 'https://wa.me/6281234567890',
        label: 'Continue on WhatsApp',
      },
      {
        kind: 'handoff',
        channel: 'email',
        href: 'https://evil.example.net/phish',
        label: 'Send an email',
      },
    ]
    const markup = renderToStaticMarkup(
      <ChatEntries
        entries={entries}
        origin={origin}
        handoffLabels={labels}
        agentName="Indies Gallery"
      />,
    )
    expect(markup).toContain('https://wa.me/6281234567890')
    expect(markup).not.toContain('evil.example.net')
  })

  it('renders a card with the shop-only price label', () => {
    const entries: ChatEntry[] = [
      {
        kind: 'card',
        card: {
          kind: 'product',
          id: 'sku-1',
          title: 'Batik tote',
          url: '/en/product/sku-1',
          image: null,
          priceLabel: 'Rp 150.000',
        },
      },
    ]
    const markup = renderToStaticMarkup(
      <ChatEntries
        entries={entries}
        origin={origin}
        handoffLabels={labels}
        agentName="Indies Gallery"
      />,
    )
    expect(markup).toContain('Batik tote')
    expect(markup).toContain('Rp 150.000')
  })
})
