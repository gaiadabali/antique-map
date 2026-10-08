import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { awaitingReply, greetingText } from './chat-thread-logic'
import { INITIAL_CHAT_STATE, type ChatEntry } from './chat-reducer'
import { chatPanelText } from './lexicon'

const stateWith = (streaming: boolean, entries: readonly ChatEntry[]) => ({ streaming, entries })

describe('greetingText', () => {
  it("greets in the site's own words when opened from no particular page", () => {
    const text = chatPanelText('en', 'gallery')
    expect(greetingText(text, 'gallery', null)).toBe(
      "Hi! I'm the Indies Gallery assistant. Ask me about the collection, or I can put you in touch with the gallery on WhatsApp.",
    )
    expect(greetingText(chatPanelText('en', 'shop'), 'shop', null)).toContain('Old East Indies')
  })

  it('names the item when opened from its page, in both languages', () => {
    const en = greetingText(chatPanelText('en', 'gallery'), 'gallery', 'Map of Java, 1635')
    expect(en).toContain('“Map of Java, 1635”')
    expect(en).not.toContain('{title}')
    const id = greetingText(chatPanelText('id', 'shop'), 'shop', 'Totebag batik')
    expect(id).toContain('“Totebag batik”')
    expect(id).toContain('Old East Indies')
  })
})

describe('awaitingReply', () => {
  it('shows the dots while streaming with no assistant text yet', () => {
    expect(awaitingReply(stateWith(true, [{ kind: 'user', text: 'Hello' }]))).toBe(true)
  })

  it('hides them once the assistant text arrives, and when idle', () => {
    expect(
      awaitingReply(
        stateWith(true, [
          { kind: 'user', text: 'Hello' },
          { kind: 'assistant', text: 'Hi' },
        ]),
      ),
    ).toBe(false)
    expect(awaitingReply(stateWith(false, [{ kind: 'user', text: 'Hello' }]))).toBe(false)
    expect(awaitingReply(INITIAL_CHAT_STATE)).toBe(false)
  })

  it('hides them while a status line is showing', () => {
    expect(
      awaitingReply(
        stateWith(true, [
          { kind: 'user', text: 'Hello' },
          { kind: 'status', label: 'Searching the collection' },
        ]),
      ),
    ).toBe(false)
  })
})
