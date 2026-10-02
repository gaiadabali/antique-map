/**
 * `events` access on a real Postgres (TASKS.md 3.4.b): the collection is append-only — nobody
 * updates or deletes an event over REST.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { startWorksStack, server } from '../works/works.test-support'

describe.skipIf(!server)('events: append-only on a real database', () => {
  let stack: Awaited<ReturnType<typeof startWorksStack>>

  beforeAll(async () => {
    stack = await startWorksStack('cms_events_access_test', (config, key) =>
      getPayload({ config, key }),
    )
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const event = () => ({
    site: 'shop',
    name: 'page.viewed',
    at: new Date().toISOString(),
    day: '2026-10-03',
    source: 'server',
    path: '/',
  })

  it('creates as the owner and refuses updates or deletes', async () => {
    const created = await stack.rest('POST', '/api/events', {
      role: 'owner',
      json: event(),
    })
    expect(created.status).toBe(201)
    const { doc } = (await created.json()) as { doc: { id: number } }

    expect(
      (
        await stack.rest('PATCH', `/api/events/${doc.id}`, {
          role: 'owner',
          json: { path: '/changed' },
        })
      ).status,
    ).toBe(403)
    expect((await stack.rest('DELETE', `/api/events/${doc.id}`, { role: 'owner' })).status).toBe(
      403,
    )
  })
})
