import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { ChatLauncher } from './chat-launcher'
import { chatPanelText } from './lexicon'

describe('the floating chat launcher', () => {
  it('is one labelled button until opened — no panel, no lexicon text, no Turnstile', () => {
    const text = chatPanelText('en', 'gallery')
    const markup = renderToStaticMarkup(
      <ChatLauncher
        label="Chat with us"
        site="gallery"
        locale="en"
        origin="https://indies-gallery.gaiada.com"
        turnstileSiteKey="key"
        text={text}
        suggestions={[]}
        contact={{ whatsappHref: null, emailHref: null }}
      />,
    )
    expect(markup).toMatch(
      /^<button type="button" class="[^"]*launcher[^"]*" aria-haspopup="dialog">/,
    )
    expect(markup).toContain('Chat with us')
    expect(markup).not.toContain('role="dialog"')
    expect(markup).not.toContain(text.composerLabel)
  })
})
