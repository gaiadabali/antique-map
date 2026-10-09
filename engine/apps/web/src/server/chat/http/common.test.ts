import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { CHAT_LIMITS } from '../env'
import { readJson } from './common'

function chunked(text: string): Request {
  const bytes = new TextEncoder().encode(text)
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let at = 0; at < bytes.length; at += 1024) controller.enqueue(bytes.slice(at, at + 1024))
      controller.close()
    },
  })
  return new Request('http://localhost/api/x/chat', {
    method: 'POST',
    body: stream,
    duplex: 'half',
  } as RequestInit)
}

describe('readJson caps a chunked body', () => {
  it('refuses a body over the cap that declares no Content-Length', async () => {
    const request = chunked(JSON.stringify({ text: 'a'.repeat(CHAT_LIMITS.maxBodyBytes * 2) }))
    expect(request.headers.get('content-length')).toBeNull()
    expect(await readJson(request)).toBeNull()
  })

  it('reads a chunked body within the cap', async () => {
    expect(await readJson(chunked('{"a":1}'))).toEqual({ a: 1 })
  })
})
