import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// `lexicon/index.ts` is `server-only`; the stub lets this Node-run test import it directly,
// the same pattern `server/chat/tools/tools.test.ts` uses.
vi.mock('server-only', () => ({}))

import { ChatDisclosure } from './chat-disclosure'
import { chatPanelText } from './lexicon'

describe('the chat disclosure', () => {
  it('shows the AI disclosure', () => {
    const text = chatPanelText('en', 'gallery')
    const markup = renderToStaticMarkup(<ChatDisclosure text={text} privacyHref="/en/privacy" />)
    expect(markup).toContain('AI assistant')
    expect(markup).toContain('/en/privacy')
  })
})
