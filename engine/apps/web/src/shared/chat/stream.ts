/**
 * Parses `POST /api/x/chat/message`'s `text/event-stream` body (AI.md §2.2): one `data: <JSON>\n\n`
 * per event. A pure function so the panel's streaming can be tested without a network or a DOM —
 * feed it whatever arrived so far, keep the returned `rest` and feed it the next chunk.
 */
import type { ChatEvent } from './types'

export type ParsedChunk = {
  readonly events: readonly ChatEvent[]
  readonly rest: string
}

/** `buffer` is everything decoded so far (a previous `rest` plus newly-arrived bytes). */
export function parseSseChunk(buffer: string): ParsedChunk {
  const events: ChatEvent[] = []
  let rest = buffer
  let boundary = rest.indexOf('\n\n')
  while (boundary !== -1) {
    const raw = rest.slice(0, boundary)
    rest = rest.slice(boundary + 2)
    const line = raw.startsWith('data:') ? raw.slice(5).trimStart() : null
    if (line !== null && line !== '') {
      try {
        events.push(JSON.parse(line) as ChatEvent)
      } catch {
        // A malformed line is dropped rather than crashing the panel.
      }
    }
    boundary = rest.indexOf('\n\n')
  }
  return { events, rest }
}
