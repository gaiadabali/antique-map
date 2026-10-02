/**
 * `redirects` uniqueness on a real Postgres (TASKS.md 3.4.b): the same `from` path is allowed on
 * different sites but not twice on the same site.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { startWorksStack, server } from '../works/works.test-support'

describe.skipIf(!server)('redirects: uniqueness on a real database', () => {
  let stack: Awaited<ReturnType<typeof startWorksStack>>

  beforeAll(async () => {
    stack = await startWorksStack('cms_redirects_uniq_test', (config, key) =>
      getPayload({ config, key }),
    )
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const redirect = (site: 'gallery' | 'shop', from: string) => ({
    site,
    from,
    to: '/new',
    code: '301',
    source: 'slug-change',
  })

  it('rejects a duplicate from on the same site and allows it on the other site', async () => {
    const first = await stack.rest('POST', '/api/redirects', {
      role: 'owner',
      json: redirect('gallery', '/old'),
    })
    expect(first.status).toBe(201)

    const dup = await stack.rest('POST', '/api/redirects', {
      role: 'owner',
      json: redirect('gallery', '/old'),
    })
    expect(dup.status).toBe(400)

    const other = await stack.rest('POST', '/api/redirects', {
      role: 'owner',
      json: redirect('shop', '/old'),
    })
    expect(other.status).toBe(201)
  })
})
