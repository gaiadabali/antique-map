/**
 * No request leaves an upload temp file behind (TASKS.md 8.3.h), proven over Payload's real REST
 * handler on a real database: multipart POSTs and PATCHes to `users`, to the `works` stub, to a
 * stub global and a writable one, to non-operation endpoints, the login, custom endpoints, and the
 * parser's own failures — anonymous and signed in, refused, failed and successful. Each must leave
 * the temp folder as empty as it found it. (Before 8.3.h, an anonymous 403 left the whole file.)
 *
 * Runs when CMS_TEST_POSTGRES_URL names a server (e.g. postgres://postgres:postgres@localhost:5432/
 * postgres); otherwise it skips — a setup state; a named server that refuses fails.
 */
import { getPayload } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import {
  form,
  hangingUpBody,
  LIMIT,
  PROBE_GLOBAL,
  PROBES,
  startProbe,
  type Probe,
} from './request-temp-files.test-support'

const server = process.env.CMS_TEST_POSTGRES_URL
const PASSWORD = 'temp files test password 42'
const FILE = { bytes: 256 * 1024 }

describe.skipIf(!server)('upload temp files, on every endpoint (on Postgres)', () => {
  let probe: Probe
  let token: string
  let adminId: number

  const post = (route: string, body: FormData, signedIn = false) =>
    probe.rest('POST', route, { form: body, ...(signedIn ? { token } : {}) })
  const patch = (route: string, body: FormData, signedIn = false) =>
    probe.rest('PATCH', route, { form: body, ...(signedIn ? { token } : {}) })

  beforeAll(async () => {
    probe = await startProbe(server!, (config, key) => getPayload({ config, key }))
    const admin = await probe.payload.create({
      collection: 'users',
      data: { email: 'admin@temp-files.test', password: PASSWORD, name: 'Admin', roles: ['admin'] },
    })
    adminId = admin.id as number
    const login = await probe.rest('POST', '/api/users/login', {
      json: { email: 'admin@temp-files.test', password: PASSWORD },
    })
    token = ((await login.json()) as { token: string }).token
    expect(token).toBeTruthy()
  }, 180_000)

  afterEach(() => probe?.clear())

  afterAll(async () => {
    await probe?.stop()
  }, 60_000)

  it('streams the file into the test’s folder while the request runs — the folder is the right one', async () => {
    const response = await post(`/api/${PROBES}/echo`, form({}, FILE))
    expect(response.status).toBe(200)
    const { during } = (await response.json()) as { during: string }
    expect(during.startsWith(probe.tempDir)).toBe(true)
    expect(probe.leftovers()).toEqual([])
  }, 30_000)

  it('anonymous POST and PATCH to users: refused, nothing left', async () => {
    expect((await post('/api/users', form({ email: 'x@y.z', password: 'p' }, FILE))).status).toBe(
      403,
    )
    expect((await patch(`/api/users/${adminId}`, form({ name: 'X' }, FILE))).status).toBe(403)
    expect([200, 403]).toContain(
      (await patch('/api/users?where[id][exists]=true', form({}, FILE))).status,
    )
    expect(probe.leftovers()).toEqual([])
  }, 30_000)

  it('signed-in PATCH to users, by id and in bulk: saved, nothing left', async () => {
    expect((await patch(`/api/users/${adminId}`, form({ name: 'A' }, FILE), true)).status).toBe(200)
    const bulk = await patch(
      `/api/users?where[id][equals]=${adminId}`,
      form({ name: 'B' }, FILE),
      true,
    )
    expect(bulk.status).toBe(200)
    expect(probe.leftovers()).toEqual([])
  }, 30_000)

  it('the works stub, anonymous and signed in: refused, nothing left', async () => {
    expect((await post('/api/works', form({}, FILE))).status).toBe(403)
    expect((await post('/api/works', form({}, FILE), true)).status).toBe(403)
    expect([403, 404]).toContain((await patch('/api/works/1', form({}, FILE), true)).status)
    expect(probe.leftovers()).toEqual([])
  }, 30_000)

  it('globals: a stub refuses, a writable one saves, and neither leaves anything', async () => {
    expect((await post('/api/globals/brand-settings', form({}, FILE))).status).toBe(403)
    expect((await post('/api/globals/brand-settings', form({}, FILE), true)).status).toBe(403)
    const saved = await post(`/api/globals/${PROBE_GLOBAL}`, form({ note: 'n' }, FILE))
    expect(saved.status).toBe(200)
    expect(probe.leftovers()).toEqual([])
  }, 30_000)

  it('endpoints that are no operation — document access — leave nothing', async () => {
    expect((await post(`/api/users/access/${adminId}`, form({}, FILE))).status).toBe(200)
    expect((await post('/api/globals/brand-settings/access', form({}, FILE))).status).toBe(200)
    expect((await post('/api/users/logout', form({}, FILE), true)).status).toBe(200)
    expect(probe.leftovers()).toEqual([])
  }, 30_000)

  it('the login, failed and successful, leaves nothing', async () => {
    const wrong = await post(
      '/api/users/login',
      form({ email: 'admin@temp-files.test', password: 'no' }, FILE),
    )
    expect(wrong.status).toBe(401)
    const right = await post(
      '/api/users/login',
      form({ email: 'admin@temp-files.test', password: PASSWORD }, FILE),
    )
    expect(right.status).toBe(200)
    expect(probe.leftovers()).toEqual([])
  }, 30_000)

  it('a file under another field name than `file` — in req.files alone — leaves nothing', async () => {
    expect((await post('/api/users', form({}, { ...FILE, field: 'attachment' }))).status).toBe(403)
    expect(
      (await post(`/api/${PROBES}`, form({ note: 'n' }, { ...FILE, field: 'x' }))).status,
    ).toBe(201)
    expect(probe.leftovers()).toEqual([])
  }, 30_000)

  it('custom endpoints, answering or throwing after parsing, and masters’ upload-url leave nothing', async () => {
    expect((await post(`/api/${PROBES}/echo`, form({}, FILE))).status).toBe(200)
    expect((await post(`/api/${PROBES}/explode`, form({}, FILE))).status).toBe(500)
    const masters = await post(
      '/api/masters/upload-url',
      form({}, { ...FILE, field: 'other' }),
      true,
    )
    expect(masters.status).toBeGreaterThanOrEqual(400)
    expect(probe.leftovers()).toEqual([])
  }, 30_000)

  it('a body that fails to parse after its file — bad `_payload` JSON — leaves nothing', async () => {
    const response = await post('/api/users', form('{not json', FILE))
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(probe.leftovers()).toEqual([])
  }, 30_000)

  it('the parser’s own refusals — over the limit, two files, a client hanging up — leave nothing', async () => {
    expect((await post('/api/users', form({}, { bytes: LIMIT + 1 }))).status).toBe(413)
    const two = form({}, FILE)
    two.append('second', new Blob([new Uint8Array(1024)]), 'second.pdf')
    expect((await post('/api/users', two)).status).toBe(413)
    const cut = await probe.rest('POST', '/api/users', { body: hangingUpBody(64 * 1024) })
    expect(cut.status).toBeGreaterThanOrEqual(400)
    expect(probe.leftovers()).toEqual([])
  }, 30_000)
})
