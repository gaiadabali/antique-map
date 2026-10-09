/**
 * Host trust on a production build (TASKS.md 2.2.e; ARCHITECTURE.md §2; SECURITY.md X2): the
 * request's `Host` alone picks the site, against the server's allow-list (GALLERY_HOSTS,
 * SHOP_HOSTS; ADMIN_HOST unset, so the shop's host is the admin's).
 *
 * - a host on no list is a plain 404 for every path, `/admin` and Payload's REST included, and
 *   carries no `Location`: it picks no site and builds no URL;
 * - a spoofed `X-Forwarded-Host` changes nothing: not the site, not the admin's host, not a URL;
 * - `/admin` and `/api/*` outside `/api/x/` and `/api/health` answer on the admin host and are 404
 *   on the other.
 *
 * Every request goes to 127.0.0.1 on the server's port with the `Host` written by hand (Node's own
 * `http`, which sends the header as given and follows no redirect), so no resolver decides.
 * Each host's own site, at both widths, is the smoke's and axe's (`tests/e2e/smoke`, `a11y`).
 */
import { request as httpRequest } from 'node:http'

import { expect, test, type TestInfo } from '@playwright/test'

type HostsMetadata = { port: string; gallery: string; shop: string }
type Answer = { status: number; location: string | undefined; body: string }

const metaOf = (testInfo: TestInfo) => testInfo.project.metadata as HostsMetadata

/** `GET path` (or `method`) on the server's port with exactly these headers. */
function ask(
  testInfo: TestInfo,
  host: string,
  path: string,
  headers: Record<string, string> = {},
  method = 'GET',
): Promise<Answer> {
  const { port } = metaOf(testInfo)
  return new Promise((resolve, reject) => {
    const sent = httpRequest(
      {
        host: '127.0.0.1',
        port: Number(port),
        path,
        method,
        headers: { host: `${host}:${port}`, 'user-agent': 'e2e-hosts', ...headers },
      },
      (response) => {
        let body = ''
        response.setEncoding('utf8')
        response.on('data', (chunk: string) => (body += chunk))
        response.on('end', () =>
          resolve({ status: response.statusCode ?? 0, location: response.headers.location, body }),
        )
      },
    )
    sent.on('error', reject)
    sent.end()
  })
}

const UNKNOWN = ['evil.example.com', 'unknown.localhost', 'gallery.localhost.evil.example.com']
const PATHS = [
  '/',
  '/id',
  '/admin',
  '/admin/login',
  '/api/users/me',
  '/favicon.ico',
  '/gallery/logo.svg',
]

test.describe('a host on no list', () => {
  for (const host of UNKNOWN) {
    test(`${host} is a plain 404 on every path, with no Location`, async () => {
      const testInfo = test.info()
      for (const path of PATHS) {
        const answer = await ask(testInfo, host, path)
        expect(answer.status, `${host}${path}`).toBe(404)
        expect(answer.location, `${host}${path}`).toBeUndefined()
        expect(answer.body, `${host}${path}`).toBe('Not found')
      }
    })
  }

  test('still answers the deploy’s health check on loopback', async () => {
    const testInfo = test.info()
    expect((await ask(testInfo, '127.0.0.1', '/api/health')).status).toBe(200)
  })
})

test.describe('a spoofed X-Forwarded-Host', () => {
  test('changes nothing: each host still serves its own site', async () => {
    const testInfo = test.info()
    const { gallery, shop } = metaOf(testInfo)
    // Since phase 4 the home's <h1> is the hero line, so a site is told by what the page says of
    // itself: its `data-site` and the brand name in its header.
    for (const [host, other, key, own] of [
      [gallery, shop, 'gallery', 'Indies Gallery'],
      [shop, gallery, 'shop', 'Old East Indies'],
    ] as const) {
      for (const spoof of [other, 'evil.example.com']) {
        const answer = await ask(testInfo, host, '/', { 'x-forwarded-host': spoof })
        expect(answer.status, `${host} as ${spoof}`).toBe(200)
        expect(answer.body, `${host} as ${spoof}`).toContain(`data-site="${key}"`)
        expect(answer.body, `${host} as ${spoof}`).toContain(
          `<span class="site-name">${own}</span>`,
        )
        expect(answer.body, `${host} as ${spoof}`).not.toContain('evil.example.com')
      }
    }
  })

  test('makes no unknown host known, and no host the admin’s', async () => {
    const testInfo = test.info()
    const { gallery, shop } = metaOf(testInfo)
    expect(
      (await ask(testInfo, 'evil.example.com', '/', { 'x-forwarded-host': gallery })).status,
    ).toBe(404)
    expect(
      (await ask(testInfo, gallery, '/admin/login', { 'x-forwarded-host': shop })).status,
    ).toBe(404)
    expect(
      (await ask(testInfo, gallery, '/api/users/me', { 'x-forwarded-host': shop })).status,
    ).toBe(404)
  })

  test('never reaches an absolute URL a page builds', async () => {
    const testInfo = test.info()
    const { gallery, port } = metaOf(testInfo)
    const answer = await ask(testInfo, gallery, '/id', { 'x-forwarded-host': 'evil.example.com' })
    expect(answer.body).toContain(`<link rel="canonical" href="http://${gallery}:${port}/id"`)
  })
})

test.describe('the admin and Payload’s REST answer on the admin host alone', () => {
  test('/admin is 200 on the shop’s host and 404 on the gallery’s', async () => {
    const testInfo = test.info()
    const { gallery, shop } = metaOf(testInfo)
    expect((await ask(testInfo, shop, '/admin/login')).status).toBe(200)
    expect((await ask(testInfo, gallery, '/admin/login')).status).toBe(404)
    expect((await ask(testInfo, gallery, '/admin')).status).toBe(404)
  })

  test('/api/* is 404 on the gallery’s host, but /api/x/ and /api/health answer', async () => {
    const testInfo = test.info()
    const { gallery, shop } = metaOf(testInfo)
    expect((await ask(testInfo, shop, '/api/users/me')).status).toBe(200)
    for (const path of ['/api/users/me', '/api/works', '/api/media']) {
      expect((await ask(testInfo, gallery, path)).status, path).toBe(404)
    }
    expect((await ask(testInfo, gallery, '/api/users/login', {}, 'POST')).status).toBe(404)
    expect((await ask(testInfo, gallery, '/api/health')).status).toBe(200)
    // An engine route answers on either site's host: robots, through its root file.
    expect((await ask(testInfo, gallery, '/robots.txt')).status).toBe(200)
  })
})
