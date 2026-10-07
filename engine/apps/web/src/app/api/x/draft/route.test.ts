/**
 * `POST /api/x/draft`'s mount (8.3.a): the admin's handler answers; a failure it did not expect
 * (no database yet, say) is a plain 503 — never a stack, a key or the request body.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const postDraft = vi.fn<(request: Request) => Promise<Response>>()
vi.mock('../../../(payload)/admin/ai/handler', () => ({ postDraft }))

import { POST } from './route'

const request = () =>
  new Request('http://localhost/api/x/draft', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ workId: 1 }),
  })

describe('POST /api/x/draft (8.3.a)', () => {
  beforeEach(() => postDraft.mockReset())

  it('answers what the admin’s handler answers', async () => {
    postDraft.mockResolvedValue(new Response('{"ok":false,"code":"not_allowed"}', { status: 403 }))
    const response = await POST(request())
    expect(response.status).toBe(403)
    expect(postDraft).toHaveBeenCalledOnce()
  })

  it('answers an unexpected failure with a plain 503', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    postDraft.mockRejectedValue(new Error('connect ECONNREFUSED postgres://user:secret@db'))
    const response = await POST(request())
    expect(response.status).toBe(503)
    const body = await response.text()
    expect(JSON.parse(body)).toEqual({ ok: false, code: 'unavailable' })
    expect(body).not.toMatch(/secret|ECONNREFUSED/)
  })
})
