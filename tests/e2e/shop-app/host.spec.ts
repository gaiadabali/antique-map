/**
 * One app, one site (AGENTS.md; TASKS.md 23.2): the shop app answers the shop's host alone. The
 * gallery's host and an unknown one are a 404 on the shop's port — the admin with them — and the
 * shop's pages live at the root, with no `/shop/<locale>` prefix (the old internal path is not
 * found). Raw HTTP with a chosen `Host`, as `tests/e2e/hosts/` does for today's app.
 */
import { request as httpRequest } from 'node:http'

import { expect, test } from '@playwright/test'

import { PORT, record, SHOP_HOST } from './support'

function status(host: string, path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const sent = httpRequest(
      { host: '127.0.0.1', port: Number(PORT), path, headers: { host: `${host}:${PORT}` } },
      (response) => {
        response.resume()
        resolve(response.statusCode ?? 0)
      },
    )
    sent.on('error', reject)
    sent.end()
  })
}

test('the shop app serves its own host only, at the root', async () => {
  const seen: Record<string, number> = {}
  const cases: [string, string, number][] = [
    [SHOP_HOST, '/', 200],
    [SHOP_HOST, '/admin/login', 200],
    [SHOP_HOST, '/shop/en', 404],
    ['gallery.localhost', '/', 404],
    ['gallery.localhost', '/admin/login', 404],
    ['unknown.localhost', '/', 404],
  ]
  for (const [host, path, expected] of cases) {
    const answer = await status(host, path)
    seen[`${host}${path}`] = answer
    expect(answer, `${host}${path}`).toBe(expected)
  }
  await record('host', seen)
})
