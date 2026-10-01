/**
 * The placeholder mount target (C13 `UNBUILT_HANDLER`, TASKS.md 4.6.d): a plain, uncached 404 to
 * every method that never reads a body, and the robots placeholder failing closed (4.1 senior-be
 * #2) until SEO builds robots. Moved from `legacy/` with the code it covers.
 */
import { describe, expect, it } from 'vitest'

import { GET as robots } from './robots/route'
import { GET as unbuiltGet, POST as unbuiltPost } from './route'

const request = (path: string, method = 'GET') => new Request(`http://localhost${path}`, { method })

describe('the placeholder mount target', () => {
  it('answers 404 to a GET and a POST alike, never cached, never a redirect', async () => {
    for (const response of [await unbuiltGet(request('/api/x/search')), await unbuiltPost()]) {
      expect(response.status).toBe(404)
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(response.headers.get('content-type')).toMatch(/^text\/plain/)
      expect(response.headers.get('x-content-type-options')).toBe('nosniff')
      expect(response.headers.get('location')).toBeNull()
    }
  })

  it('takes no request body at all, so a write reaches nothing', () => {
    expect(unbuiltPost.length).toBe(0)
  })
})

describe('the robots placeholder (senior-be #2)', () => {
  it('fails closed: every crawler is disallowed until SEO builds robots', async () => {
    const response = await robots(request('/api/x/robots'))
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.text()).toBe('User-agent: *\nDisallow: /\n')
  })
})
