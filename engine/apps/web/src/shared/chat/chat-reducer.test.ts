import { describe, expect, it } from 'vitest'

import { chatReducer, INITIAL_CHAT_STATE } from './chat-reducer'
import type { ChatEvent } from './types'

const apply = (events: readonly ChatEvent[]) =>
  events.reduce((state, event) => chatReducer(state, { type: 'event', event }), INITIAL_CHAT_STATE)

describe('the chat reducer', () => {
  it('streams a reply token by token into one assistant entry', () => {
    const state = apply([
      { type: 'delta', text: 'Hel' },
      { type: 'delta', text: 'lo' },
    ])
    expect(state.entries).toEqual([{ kind: 'assistant', text: 'Hello' }])
  })

  it('the lead form appears only after the visitor asks', () => {
    const afterEvent = apply([
      {
        type: 'lead_form',
        kind: 'chat',
        itemIds: [],
        consentText: 'Share these details…',
        consentVersion: 'v1',
        consentToken: 'token-123',
      },
    ])
    expect(afterEvent.leadForm).not.toBeNull()
    expect(afterEvent.leadFormOpen).toBe(false)

    const afterTap = chatReducer(afterEvent, { type: 'openLeadForm' })
    expect(afterTap.leadFormOpen).toBe(true)
  })

  it("rate-limited shows the retry time", () => {
    let state = apply([{ type: 'error', code: 'rate_limited', message: 'Please wait.' }])
    state = chatReducer(state, { type: 'retryAfter', seconds: 30 })
    expect(state.errorCode).toBe('rate_limited')
    expect(state.retryAfterSeconds).toBe(30)
  })

  it('the kill switch shows the handoff', () => {
    const state = apply([
      { type: 'handoff', channel: 'whatsapp', href: 'https://wa.me/6281234', label: 'Continue on WhatsApp' },
      { type: 'error', code: 'disabled', message: 'The assistant is switched off.' },
    ])
    expect(state.entries).toEqual([
      { kind: 'handoff', channel: 'whatsapp', href: 'https://wa.me/6281234', label: 'Continue on WhatsApp' },
    ])
    expect(state.errorCode).toBe('disabled')
    expect(state.errorMessage).toBe('The assistant is switched off.')
  })

  it('a card event keeps the shop-only price label distinct from a gallery card', () => {
    const state = apply([
      { type: 'card', kind: 'work', id: '42', title: 'A map', url: '/item/42', image: null },
    ])
    expect(state.entries[0]).toEqual({
      kind: 'card',
      card: { kind: 'work', id: '42', title: 'A map', url: '/item/42', image: null, statusLabel: undefined, priceLabel: undefined },
    })
  })

  it('done stops streaming without clearing the transcript', () => {
    let state = chatReducer(INITIAL_CHAT_STATE, { type: 'send', text: 'hello' })
    expect(state.streaming).toBe(true)
    state = chatReducer(state, { type: 'event', event: { type: 'done', outcome: 'answered' } })
    expect(state.streaming).toBe(false)
    expect(state.entries).toEqual([{ kind: 'user', text: 'hello' }])
  })
})
