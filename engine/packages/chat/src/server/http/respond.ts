/**
 * The chat routes' answers. Every response is `no-store`. A turn is `text/event-stream`, one JSON
 * object per `data:` line (AI.md §2.2); a refusal before the turn starts is the same stream —
 * the handoff buttons, then one `error` event — under the refusal's status (429 with
 * `Retry-After` for a rate limit), so the panel reads every answer one way.
 */
import 'server-only'

import type { ChatEvent } from '../types'

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Accel-Buffering': 'no',
  'X-Content-Type-Options': 'nosniff',
} as const

export function sseLine(event: ChatEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

/** A finished stream of `events` under `status`. */
export function eventsResponse(
  events: readonly ChatEvent[],
  status: number,
  headers: Readonly<Record<string, string>> = {},
): Response {
  return new Response(events.map(sseLine).join(''), {
    status,
    headers: { ...SSE_HEADERS, ...headers },
  })
}

/** A live stream: `run` emits events; the stream closes when it settles. */
export function streamResponse(
  run: (emit: (event: ChatEvent) => void) => Promise<void>,
  headers: Readonly<Record<string, string>> = {},
): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true
      const emit = (event: ChatEvent) => {
        if (!open) return
        try {
          controller.enqueue(encoder.encode(sseLine(event)))
        } catch {
          open = false
        }
      }
      try {
        await run(emit)
      } finally {
        open = false
        try {
          controller.close()
        } catch {
          // Already closed by a client that went away.
        }
      }
    },
  })
  return new Response(body, { status: 200, headers: { ...SSE_HEADERS, ...headers } })
}

export function jsonResponse(
  body: unknown,
  status: number,
  headers: Readonly<Record<string, string>> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  })
}
