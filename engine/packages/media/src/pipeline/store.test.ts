/** The pipeline's bucket port: a read broken mid-body is retried a bounded number of times. */
import { describe, expect, it, vi } from 'vitest'

import type { BucketObjects } from '../storage/objects'
import { bucketPipelineStore } from './store'

const objects = (get: BucketObjects['get']): BucketObjects => ({
  bucket: 'test-media',
  get,
  put: vi.fn(async () => 'written' as const),
  size: vi.fn(async () => null),
  remove: vi.fn(async () => undefined),
  list: vi.fn(async () => []),
})

describe('bucketPipelineStore', () => {
  it('retries a reset read, then answers', async () => {
    const get = vi
      .fn<BucketObjects['get']>()
      .mockRejectedValueOnce(new Error('read ECONNRESET'))
      .mockResolvedValueOnce(new Uint8Array([1, 2, 3]))
    expect(await bucketPipelineStore(objects(get)).read('uploads/a.jpg')).toEqual(
      new Uint8Array([1, 2, 3]),
    )
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('gives up after three resets, and never retries a refusal', async () => {
    const reset = vi.fn<BucketObjects['get']>().mockRejectedValue(new Error('read ECONNRESET'))
    await expect(bucketPipelineStore(objects(reset)).read('uploads/a.jpg')).rejects.toThrow(
      /ECONNRESET/,
    )
    expect(reset).toHaveBeenCalledTimes(3)
    const denied = vi.fn<BucketObjects['get']>().mockRejectedValue(new Error('AccessDenied'))
    await expect(bucketPipelineStore(objects(denied)).read('uploads/a.jpg')).rejects.toThrow()
    expect(denied).toHaveBeenCalledTimes(1)
  })

  it('refuses loudly when the media key may not write', async () => {
    const store = objects(vi.fn())
    store.put = vi.fn(async () => 'denied' as const)
    await expect(
      bucketPipelineStore(store).put('derivatives/v1/x/1.webp', new Uint8Array(), 'image/webp', ''),
    ).rejects.toThrow(/may not write/)
  })
})
