/**
 * Publishing a page the way the admin does (TASKS.md 5.4 review, F1): the admin saves one locale at
 * a time, so the publish guard sees `title` as that locale's string. A draft saved in English then
 * published in English goes live; a publish without an English title is refused.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { startWorksStack, server } from '../works/works.test-support'

describe.skipIf(!server)('pages: publishing from the admin on a real database', () => {
  let stack: Awaited<ReturnType<typeof startWorksStack>>

  beforeAll(async () => {
    process.env.SITE_URL = 'http://shop.localhost:4171'
    process.env.GALLERY_HOSTS = 'gallery.localhost'
    process.env.SHOP_HOSTS = 'shop.localhost'
    process.env.PORT = '4171'
    stack = await startWorksStack('cms_pages_publish_test', (config, key) =>
      getPayload({ config, key }),
    )
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const draft = (slug: string, title: string) =>
    stack.rest('POST', '/api/pages?locale=en&draft=true', {
      role: 'owner',
      json: { site: 'gallery', kind: 'page', slug, title, body: 'Since 2001.' },
    })

  it('publishes an English draft from an English save', async () => {
    const created = await draft('about-publish-test', 'About the gallery')
    expect(created.status).toBe(201)
    const { doc } = (await created.json()) as { doc: { id: number } }

    const published = await stack.rest('PATCH', `/api/pages/${doc.id}?locale=en`, {
      role: 'owner',
      json: { _status: 'published', body: 'Since 2001, in Singapore.' },
    })
    expect(published.status).toBe(200)
    const body = (await published.json()) as { doc: { _status: string; body: string } }
    expect(body.doc._status).toBe('published')
    expect(body.doc.body).toBe('Since 2001, in Singapore.')
  })

  it('refuses to publish with a blank English title', async () => {
    const created = await draft('blank-title-test', 'Will be blanked')
    const { doc } = (await created.json()) as { doc: { id: number } }

    const refused = await stack.rest('PATCH', `/api/pages/${doc.id}?locale=en`, {
      role: 'owner',
      json: { _status: 'published', title: '   ' },
    })
    expect(refused.status).toBe(400)
  })
})
