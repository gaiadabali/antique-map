/** The legacy stub (TASKS.md 4.1.f): a plain, uncached 404 until 36.4 reads `redirects`. */
import { describe, expect, it } from 'vitest'

import { GET } from './route'

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
