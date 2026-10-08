/**
 * The beacon route hands `collect` the address nginx appended, never the whole header (finding
 * F-05): `collect` reads the first entry of what it is given, which a client chooses, so the whole
 * header would give a forged prefix a fresh limiter bucket and a fresh session hash every time.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const collect = vi.fn(
  async (_input: { address: string | null }) => new Response(null, { status: 204 }),
)
vi.mock('../../../../server/analytics/collect', () => ({
  collect: (input: { address: string | null }) => collect(input),
}))

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

  it('passes null off nginx, and for a malformed last entry', async () => {
    await post({})
    await post({ 'x-forwarded-for': '203.0.113.9, <script>' })
    expect(collect.mock.calls.map(([input]) => input.address)).toEqual([null, null])
  })
})
