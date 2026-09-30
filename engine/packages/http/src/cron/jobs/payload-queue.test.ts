/**
 * `./payload-queue` with `@engine/cms` mocked, so no Payload loads: every queue runs (`allQueues`,
 * 4.1 senior-be #4) with the route's limit, and nothing is asked of Payload before a task exists.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { cms } = vi.hoisted(() => ({ cms: vi.fn() }))
vi.mock('@engine/cms/instance', () => ({ cms }))

import { runQueue } from './payload-queue'

beforeEach(() => cms.mockReset())

describe('runQueue()', () => {
  it('runs every queue with the limit, and summarises what Payload ran', async () => {
    const run = vi.fn(async () => ({ jobStatus: { 7: {}, 8: {} }, remainingJobsFromQueried: 0 }))
    cms.mockResolvedValue({ config: { jobs: { enabled: true } }, jobs: { run } })
    expect(await runQueue({ limit: 5 })).toEqual({ ran: 2, remaining: 0, drained: false })
    expect(run).toHaveBeenCalledWith({ limit: 5, allQueues: true })
  })

  it('runs nothing while no task or workflow is registered: Payload has no queue yet', async () => {
    const run = vi.fn()
    cms.mockResolvedValue({ config: { jobs: { enabled: false } }, jobs: { run } })
    expect(await runQueue({ limit: 5 })).toEqual({
      ran: 0,
      remaining: 0,
      drained: true,
      detail: 'no-tasks',
    })
    expect(run).not.toHaveBeenCalled()
  })
})
