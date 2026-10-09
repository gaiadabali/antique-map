import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

describe('sharp concurrency', () => {
  it('is pinned at two once a media module that uses sharp is loaded', async () => {
    sharp.concurrency(8)
    await import('./derivatives')
    // The module's load-time call ran (or had run) — a fresh set must not be left at 8 by it.
    expect(sharp.concurrency()).toBe(2)
  })
})
