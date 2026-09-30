/** The legacy stub (TASKS.md 4.1.f): a plain, uncached 404 until 36.4 reads `redirects`. */
import { describe, expect, it } from 'vitest'

import { GET } from './route'
import { GET as robots } from './unbuilt/robots/route'
import { GET as unbuiltGet, POST as unbuiltPost } from './unbuilt/route'

const request = (path: string, method = 'GET') => new Request(`http://localhost${path}`, { method })

describe('/api/x/legacy/[...path]', () => {
  it.each(['/api/x/legacy/category/12-java', '/api/x/legacy/storage/products/1.jpg'])(
    '%s is a plain 404, never a redirect',
    async (path) => {
      const response = await GET(request(path))
      expect(response.status).toBe(404)
      expect(response.headers.get('location')).toBeNull()
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(response.headers.get('content-type')).toMatch(/^text\/plain/)
    },
  )
})

describe('the placeholder mount target', () => {
  it('answers 404 to a GET and a POST alike', async () => {
    expect((await unbuiltGet(request('/api/x/search'))).status).toBe(404)
    expect((await unbuiltPost()).status).toBe(404)
  })
})

describe('the robots placeholder (senior-be #2)', () => {
  it('fails closed: every crawler is disallowed until SEO builds robots', async () => {
    const response = await robots(request('/api/x/robots'))
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(await response.text()).toBe('User-agent: *\nDisallow: /\n')
  })
})
