/**
 * The payment routes with fake ports (no Payload, no database): the webhook verifies before it
 * loads or writes anything, confirms with the status API, applies the confirmed status, and
 * refuses a host the config refuses; the cron routes take the bearer they are handed and run one
 * job at a time.
 */
import { describe, expect, it, vi } from 'vitest'

import type { ApplyResult } from '../apply'
import { LOCAL_ENV, PRODUCTION_ENV, SIMULATE, statusOf } from '../payments.test-support'
import type { StatusAnswer } from '../provider'
import { simulatorProvider } from '../simulator'
import { paymentReconcileRoute, paymentSweepsRoute } from './cron'
import { MAX_BODY_BYTES, midtransWebhookRoute, type WebhookPort } from './webhook'

const ENV = { ...LOCAL_ENV, MIDTRANS_MODE: 'simulate' }
const post = (body: string, headers: Record<string, string> = {}) =>
  new Request('http://shop.localhost/api/x/webhooks/midtrans', { method: 'POST', body, headers })

function harness(answer?: StatusAnswer) {
  const applied: Array<Parameters<WebhookPort['apply']>> = []
  const port: WebhookPort = {
    confirm: vi.fn(async (): Promise<StatusAnswer> => answer ?? { found: false }),
    apply: vi.fn(async (...args: Parameters<WebhookPort['apply']>): Promise<ApplyResult> => {
      applied.push(args)
      return { outcome: 'paid', orderId: 1 }
    }),
  }
  const load = vi.fn(async () => port)
  const logs: string[] = []
  const route = midtransWebhookRoute({ env: ENV, load, log: (line) => logs.push(line) })
  return { route, load, port, applied, logs }
}

describe('the Midtrans webhook route', () => {
  const simulator = simulatorProvider(SIMULATE)
  simulator.register('8001-1', 205000)

  it('applies the status the status API confirms, and answers 200', async () => {
    const { body } = simulator.emit('8001-1', 'settle')
    const confirmed = await simulator.getStatus('8001-1')
    const { route, applied } = harness(confirmed)
    const response = await route(post(body))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true })
    expect(applied).toHaveLength(1)
    expect(applied[0]![0]).toMatchObject({
      midtransOrderId: '8001-1',
      transactionStatus: 'settlement',
    })
    expect(applied[0]![1]).toBe('simulate')
    expect(applied[0]![2]).toMatch(/^[0-9a-f]{64}$/)
  })

  it('refuses a bad signature with 401 before loading anything, and logs only a hash', async () => {
    const { payload } = simulator.emit('8001-1', 'settle')
    const forged = JSON.stringify({ ...payload, gross_amount: '1.00' })
    const { route, load, logs } = harness()
    const response = await route(post(forged))
    expect(response.status).toBe(401)
    expect(load).not.toHaveBeenCalled()
    expect(logs.join('\n')).toMatch(/ALERT webhook signature mismatch body=sha256:[0-9a-f]{64}/)
    expect(logs.join('\n')).not.toContain('8001-1')
    const unsigned = await route(post(JSON.stringify({ ...payload, signature_key: undefined })))
    expect(unsigned.status).toBe(401)
    expect(load).not.toHaveBeenCalled()
  })

  it('answers 400 for a body that is not a notification and 413 for an oversized one', async () => {
    const { route, load } = harness()
    expect((await route(post('not json'))).status).toBe(400)
    expect((await route(post('x'.repeat(MAX_BODY_BYTES + 1)))).status).toBe(413)
    expect((await route(post('{}', { 'content-length': String(MAX_BODY_BYTES + 1) }))).status).toBe(
      413,
    )
    expect(load).not.toHaveBeenCalled()
  })

  it('answers 500, writing nothing, when the status API does not confirm the notification', async () => {
    const { body } = simulator.emit('8001-1', 'settle')
    const unknown = harness({ found: false })
    expect((await unknown.route(post(body))).status).toBe(500)
    expect(unknown.applied).toHaveLength(0)
    const other = harness({
      found: true,
      status: statusOf({ midtransOrderId: '8001-2' }),
      raw: '{}',
    })
    expect((await other.route(post(body))).status).toBe(500)
    expect(other.applied).toHaveLength(0)
  })

  it('answers 500 when applying fails, so Midtrans retries', async () => {
    const { body } = simulator.emit('8001-1', 'settle')
    const confirmed = await simulator.getStatus('8001-1')
    const { route, port } = harness(confirmed)
    vi.mocked(port.apply).mockRejectedValueOnce(new Error('lock timeout'))
    expect((await route(post(body))).status).toBe(500)
  })

  it('answers 503 and touches nothing on a host whose config is refused — simulate in production', async () => {
    const { body } = simulator.emit('8001-1', 'settle')
    const load = vi.fn()
    const route = midtransWebhookRoute({
      env: { ...PRODUCTION_ENV, MIDTRANS_MODE: 'simulate' },
      load,
      log: () => {},
    })
    expect((await route(post(body))).status).toBe(503)
    expect(load).not.toHaveBeenCalled()
  })
})

describe('the payment cron routes', () => {
  const cron = (headers: Record<string, string> = {}) =>
    new Request('http://localhost/api/x/cron/sweeps', { method: 'POST', headers })
  const refuse = (request: Request) =>
    request.headers.get('authorization') === 'Bearer ok'
      ? null
      : new Response('no', { status: 401 })
  const run = { checked: 2, applied: 1, expired: 1, failed: 0 }

  it('refuses a caller the bearer check refuses, before loading anything', async () => {
    const load = vi.fn()
    const response = await paymentSweepsRoute({ refuse, load, env: ENV })(cron())
    expect(response.status).toBe(401)
    expect(load).not.toHaveBeenCalled()
  })

  it('runs its job and reports the counts', async () => {
    const jobs: string[] = []
    const load = async () => ({ run: async (job: 'sweep' | 'reconcile') => (jobs.push(job), run) })
    const sweeps = await paymentSweepsRoute({ refuse, load, env: ENV })(
      cron({ authorization: 'Bearer ok' }),
    )
    expect(await sweeps.json()).toEqual({ job: 'sweep', ...run })
    const reconcile = await paymentReconcileRoute({ refuse, load, env: ENV })(
      cron({ authorization: 'Bearer ok' }),
    )
    expect(await reconcile.json()).toEqual({ job: 'reconcile', ...run })
    expect(jobs).toEqual(['sweep', 'reconcile'])
  })

  it('answers 409 to a tick that meets a run still going', async () => {
    let finish: () => void = () => {}
    const load = async () => ({
      run: () => new Promise<typeof run>((resolve) => (finish = () => resolve(run))),
    })
    const route = paymentSweepsRoute({ refuse, load, env: ENV })
    const first = route(cron({ authorization: 'Bearer ok' }))
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect((await route(cron({ authorization: 'Bearer ok' }))).status).toBe(409)
    finish()
    expect((await first).status).toBe(200)
  })
})
