/**
 * The beacon route hands `collect` the address nginx appended, never the whole header (finding
 * F-05): `collect` reads the first entry of what it is given, which a client chooses, so the whole
 * header would give a forged prefix a fresh limiter bucket and a fresh session hash every time.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const collect = vi.fn(
  async (_input: { address: string | null; body: string | null }) =>
    new Response(null, { status: 204 }),
)
vi.mock('../../../../server/analytics/collect', () => ({
  MAX_BODY_BYTES: 8192,
  collect: (input: { address: string | null; body: string | null }) => collect(input),
}))

/** A chunked body: a stream, so the request carries no Content-Length. */
function chunked(bytes: number): Request {
  let sent = 0
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= bytes) return controller.close()
      sent += 1024
      controller.enqueue(new Uint8Array(1024).fill(97))
    },
  })
  return new Request('http://localhost/api/x/collect', {
    method: 'POST',
    body: stream,
    duplex: 'half',
  } as RequestInit)
}

import { POST } from './route'

const post = (headers: Record<string, string>) =>
  POST(new Request('http://localhost/api/x/collect', { method: 'POST', headers, body: '{}' }))

describe('POST /api/x/collect', () => {
  beforeEach(() => collect.mockClear())

  it('passes the last X-Forwarded-For entry, whatever a client put before it', async () => {
    await post({ 'x-forwarded-for': '10.1.1.1, 10.2.2.2, 203.0.113.9' })
    await post({ 'x-forwarded-for': '10.9.9.9, 203.0.113.9' })
    expect(collect.mock.calls.map(([input]) => input.address)).toEqual([
      '203.0.113.9',
      '203.0.113.9',
    ])
  })

  it('stops reading a chunked body at the cap and hands collect null', async () => {
    const response = await POST(chunked(1024 * 1024))
    expect(response.status).toBe(204)
    expect(collect.mock.calls[0]?.[0].body).toBeNull()
  })

  it('reads a chunked body within the cap', async () => {
    await POST(chunked(2048))
    expect(collect.mock.calls[0]?.[0].body).toHaveLength(2048)
  })

  it('passes null off nginx, and for a malformed last entry', async () => {
    await post({})
    await post({ 'x-forwarded-for': '203.0.113.9, <script>' })
    expect(collect.mock.calls.map(([input]) => input.address)).toEqual([null, null])
  })
})
