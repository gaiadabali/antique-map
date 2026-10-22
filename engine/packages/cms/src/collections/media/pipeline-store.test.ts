/** The pipeline builds one S3 client per process, not one per run. */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { storeFromEnv } from './pipeline'

afterEach(() => vi.unstubAllEnvs())

describe('storeFromEnv', () => {
  it('reuses one store across runs while the environment is unchanged', () => {
    vi.stubEnv('S3_ENDPOINT', 'http://127.0.0.1:9000')
    vi.stubEnv('S3_BUCKET', 'test-media')
    vi.stubEnv('S3_ACCESS_KEY_ID', 'key')
    vi.stubEnv('S3_SECRET_ACCESS_KEY', 'secret')
    const first = storeFromEnv()
    expect(first).not.toBeNull()
    expect(storeFromEnv()).toBe(first)
    vi.stubEnv('S3_BUCKET', 'other-media')
    expect(storeFromEnv()).not.toBe(first)
  })

  it('is null while no bucket is configured', () => {
    vi.stubEnv('S3_BUCKET', '')
    expect(storeFromEnv()).toBeNull()
  })
})
