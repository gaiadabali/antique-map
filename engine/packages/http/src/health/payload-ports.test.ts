/**
 * `./payload-ports` with `@engine/cms` mocked, so no Payload loads (4.3 senior-be #13): one probe
 * per check, whose answer the boot check re-reads; an unmigrated database refused; the queue read
 * with `runJobs`' filter on Payload's jobs collection, and only when one exists.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { cms, cmsPool, probeAnswer } = vi.hoisted(() => ({
  cms: vi.fn(),
  cmsPool: vi.fn((payload: { db: { pool: unknown } }) => payload.db.pool),
  probeAnswer: vi.fn(async () => ({ transactionIsolation: 'read committed' })),
}))

vi.mock('@engine/cms/instance', () => ({ cms, cmsPool }))
vi.mock('@engine/cms/db/probe', () => ({ databaseProbe: () => probeAnswer }))

type Call = { collection: string; where?: unknown; sort?: string; limit?: number }

function fakePayload(options: { jobs: boolean; migrations: number; pending?: number }) {
  const calls: Call[] = []
  return {
    calls,
    payload: {
      config: { jobs: { enabled: options.jobs } },
      db: { pool: { connect: async () => ({}) } },
      count: async (args: Call) => {
        calls.push(args)
        return { totalDocs: args.collection === 'payload-migrations' ? options.migrations : 0 }
      },
      find: async (args: Call) => {
        calls.push(args)
        return {
          totalDocs: options.pending ?? 0,
          docs: options.pending ? [{ createdAt: new Date(Date.now() - 60_000).toISOString() }] : [],
        }
      },
    },
  }
}

async function load() {
  vi.resetModules() // each test gets a fresh module: its bounded queries hold state
  return (await import('./payload-ports')).payloadHealthPorts()
}

beforeEach(() => {
  cms.mockReset()
  probeAnswer.mockClear()
})

describe('the database port', () => {
  it('initialises Payload, probes once, and hands the boot check that one answer', async () => {
    const { payload } = fakePayload({ jobs: false, migrations: 1 })
    cms.mockResolvedValue(payload)
    const check = await (await load()).database()
    expect(check.ok).toBe(true)
    expect(probeAnswer).toHaveBeenCalledTimes(1)
    expect(await check.probe?.()).toEqual({ transactionIsolation: 'read committed' })
    expect(await check.probe?.()).toEqual({ transactionIsolation: 'read committed' })
    expect(probeAnswer).toHaveBeenCalledTimes(1) // the boot check's re-read asks nothing
  })

  it('refuses a database no migration reached (the independent 4.8 review, S4)', async () => {
    const { payload, calls } = fakePayload({ jobs: false, migrations: 0 })
    cms.mockResolvedValue(payload)
    const check = await (await load()).database()
    expect(check).toMatchObject({ ok: false, detail: 'unmigrated' })
    expect(calls).toContainEqual({ collection: 'payload-migrations', overrideAccess: true })
  })

  it('lets cms()’s own failure through, for the boot check to redact and log', async () => {
    cms.mockRejectedValue(new Error('cannot connect to Postgres: ECONNREFUSED'))
    await expect((await load()).database()).rejects.toThrow('ECONNREFUSED')
  })
})

describe('the queue port', () => {
  it('reads nothing while no task is registered: there is no jobs collection yet', async () => {
    const { payload, calls } = fakePayload({ jobs: false, migrations: 1 })
    cms.mockResolvedValue(payload)
    expect(await (await load()).queue()).toEqual({
      ok: true,
      detail: 'no-tasks',
      pending: 0,
      lagSeconds: 0,
      stalled: 0,
    })
    expect(calls).toEqual([])
  })

  it('counts with runJobs’ filter on payload-jobs, oldest first, and reports the lag', async () => {
    const { payload, calls } = fakePayload({ jobs: true, migrations: 1, pending: 2 })
    cms.mockResolvedValue(payload)
    const check = await (await load()).queue()
    expect(check).toMatchObject({ ok: true, pending: 2, stalled: 0 })
    expect(check.lagSeconds).toBeGreaterThanOrEqual(59)
    const find = calls.find((call) => call.sort !== undefined)
    expect(find).toMatchObject({ collection: 'payload-jobs', sort: 'createdAt', limit: 1 })
    expect(JSON.stringify(find?.where)).toContain('"hasError":{"not_equals":true}')
    expect(calls.filter((call) => call.collection === 'payload-jobs')).toHaveLength(2)
  })
})
