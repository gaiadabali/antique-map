/** A duplicate's SKUs: a copy suffix the SKU rules accept, never one already in use. */
import { describe, expect, it } from 'vitest'

import { copySku, COPY_SUFFIX, skuOfCopy } from './duplicate'
import { SKU_MAX_LENGTH, SKU_PATTERN } from './skus'

describe('copySku', () => {
  it('appends -COPY, a valid SKU', async () => {
    const sku = await copySku('PRT-1-A4', async () => false)
    expect(sku).toBe(`PRT-1-A4${COPY_SUFFIX}`)
    expect(SKU_PATTERN.test(sku)).toBe(true)
  })

  it('numbers the copy while a candidate is taken', async () => {
    const taken = new Set(['PRT-1-COPY', 'PRT-1-COPY-2'])
    expect(await copySku('PRT-1', async (c) => taken.has(c))).toBe('PRT-1-COPY-3')
  })

  it('stays within the SKU length', async () => {
    const sku = await copySku('X'.repeat(SKU_MAX_LENGTH), async (c) => c.endsWith('-COPY'))
    expect(sku.length).toBeLessThanOrEqual(SKU_MAX_LENGTH)
    expect(sku.endsWith('-COPY-2')).toBe(true)
  })
})

describe('skuOfCopy', () => {
  const req = (used: string[]) =>
    ({
      payload: {
        count: async ({ where }: { where: { or: Array<Record<string, { equals: string }>> } }) => {
          const sku = Object.values(where.or[0]!)[0]!.equals
          return { totalDocs: used.includes(sku) ? 1 : 0 }
        },
      },
    }) as never

  it('asks the products for each candidate', async () => {
    const hook = skuOfCopy as (args: unknown) => Promise<unknown>
    expect(await hook({ value: ' TOTE-1 ', req: req(['TOTE-1-COPY']) })).toBe('TOTE-1-COPY-2')
  })

  it('leaves an empty value alone', async () => {
    const hook = skuOfCopy as (args: unknown) => Promise<unknown>
    expect(await hook({ value: '', req: req([]) })).toBe('')
    expect(await hook({ value: undefined, req: req([]) })).toBeUndefined()
  })
})
