/**
 * The admin trusts its own origin alone (SECURITY.md B4, B5, X2; 2.2's second review). A staff
 * cookie sent from another site's page — the gallery's, same-site with the shop's on staging, so a
 * `SameSite=Lax` cookie rides along — authenticates nothing: Payload's REST answers it as nobody
 * and grants that origin no CORS. From the admin host's own origin, the same cookie is the staff
 * member. Run against the server's database: it signs in the e2e owner, creating it as the first
 * user when the database has none.
 */
import { request as httpRequest } from 'node:http'

import { expect, test, type TestInfo } from '@playwright/test'

import { savedToken } from '../support/sessions'

type HostsMetadata = { port: string; gallery: string; shop: string }
type Answer = {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: string
}

const OWNER = { email: 'e2e-owner@example.test', password: 'e2e-owner-password-0f3c9a' }

function send(
  testInfo: TestInfo,
  host: string,
  path: string,
  options: { method?: string; headers?: Record<string, string>; json?: unknown } = {},
): Promise<Answer> {
  const { port } = testInfo.project.metadata as HostsMetadata
  const body = options.json === undefined ? undefined : JSON.stringify(options.json)
  return new Promise((resolve, reject) => {
    const sent = httpRequest(
      {
        host: '127.0.0.1',
        port: Number(port),
        path,
        method: options.method ?? 'GET',
        headers: {
          host: `${host}:${port}`,
          'user-agent': 'e2e-admin-origin',
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
          ...options.headers,
        },
      },
      (response) => {
        let text = ''
        response.setEncoding('utf8')
        response.on('data', (chunk: string) => (text += chunk))
        response.on('end', () =>
          resolve({ status: response.statusCode ?? 0, headers: response.headers, body: text }),
        )
      },
    )
    sent.on('error', reject)
    if (body !== undefined) sent.write(body)
    sent.end()
  })
}

/** The owner's session cookie, on the admin host: signed in, or registered as the first user. */
async function ownerCookie(testInfo: TestInfo): Promise<string> {
  const saved = savedToken(OWNER.email) // signed in once by the global setup (sign-in is rate-limited)
  if (saved) return `payload-token=${saved}`
  const { shop } = testInfo.project.metadata as HostsMetadata
  const origin = { origin: `http://${shop}:${(testInfo.project.metadata as HostsMetadata).port}` }
  let answer = await send(testInfo, shop, '/api/users/login', {
    method: 'POST',
    headers: origin,
    json: OWNER,
  })
  if (answer.status !== 200) {
    answer = await send(testInfo, shop, '/api/users/first-register', {
      method: 'POST',
      headers: origin,
      json: { ...OWNER, confirmPassword: OWNER.password, name: 'E2E Owner' },
    })
  }
  expect(answer.status, `sign-in or first-register: ${answer.body}`).toBe(200)
  const cookies = [answer.headers['set-cookie'] ?? []].flat()
  const token = cookies
    .map((cookie) => cookie.split(';')[0] ?? '')
    .find((c) => c.startsWith('payload-token='))
  expect(token, 'a payload-token cookie').toBeTruthy()
  return token!
}

test('a staff cookie from the gallery’s origin is nobody, with no CORS grant', async () => {
  const testInfo = test.info()
  const { gallery, shop, port } = testInfo.project.metadata as HostsMetadata
  const cookie = await ownerCookie(testInfo)

  const own = await send(testInfo, shop, '/api/users/me', {
    headers: { cookie, origin: `http://${shop}:${port}` },
  })
  expect(own.status).toBe(200)
  expect(JSON.parse(own.body).user?.email).toBe(OWNER.email)

  for (const foreign of [`http://${gallery}:${port}`, 'https://evil.example.com']) {
    const answer = await send(testInfo, shop, '/api/users/me', {
      headers: { cookie, origin: foreign },
    })
    expect(JSON.parse(answer.body).user ?? null, foreign).toBeNull()
    expect(answer.headers['access-control-allow-origin'], foreign).toBeUndefined()
    expect(answer.headers['access-control-allow-credentials'], foreign).toBeUndefined()
    const preflight = await send(testInfo, shop, '/api/users/me', {
      method: 'OPTIONS',
      headers: { origin: foreign, 'access-control-request-method': 'PATCH' },
    })
    expect(preflight.headers['access-control-allow-origin'], `${foreign} preflight`).toBeUndefined()
  }
})
