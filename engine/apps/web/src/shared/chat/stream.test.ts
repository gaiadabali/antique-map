import { describe, expect, it } from 'vitest'

import { parseSseChunk } from './stream'

describe('the chat stream parser', () => {
  it('streams a reply token by token', () => {
    let buffer = ''
    const seen: string[] = []

    // Two deltas arrive in separate chunks, as `fetch`'s reader would deliver them.
    let parsed = parseSseChunk(buffer + 'data: {"type":"delta","text":"Hel"}\n\n')
    seen.push(...parsed.events.map((e) => (e.type === 'delta' ? e.text : '')))
    buffer = parsed.rest

    parsed = parseSseChunk(buffer + 'data: {"type":"delta","text":"lo"}\n\n')
    seen.push(...parsed.events.map((e) => (e.type === 'delta' ? e.text : '')))

    expect(seen).toEqual(['Hel', 'lo'])
  })

  it('holds a partial event until its terminator arrives', () => {
    const first = parseSseChunk('data: {"type":"delta","te')
    expect(first.events).toEqual([])
    expect(first.rest).toBe('data: {"type":"delta","te')

    const second = parseSseChunk(`${first.rest}xt":"hi"}\n\n`)
    expect(second.events).toEqual([{ type: 'delta', text: 'hi' }])
    expect(second.rest).toBe('')
  })

  it('reads a done event', () => {
    const { events } = parseSseChunk('data: {"type":"done","outcome":"answered"}\n\n')
    expect(events).toEqual([{ type: 'done', outcome: 'answered' }])
  })

  it('drops a malformed line rather than throwing', () => {
    expect(() => parseSseChunk('data: {not json}\n\n')).not.toThrow()
    expect(parseSseChunk('data: {not json}\n\n').events).toEqual([])
  })
})
