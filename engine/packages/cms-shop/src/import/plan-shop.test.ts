/** The stores row plan, with no database: the optional `region` and `flagship` columns. */
import { describe, expect, it } from 'vitest'

import { parseCsv } from '@engine/cms-core/import/csv'
import { STORE_COLUMNS, STORE_OPTIONAL_COLUMNS } from '@engine/cms-core/import/kinds'
import { rowOf } from '@engine/cms-core/import/plan'

import { planStoreRow } from './plan-shop'

const base = ['UBD-01', 'Ubud One', 'Jl. Raya 1', 'Ubud', '-8.5069', '115.2625', '', '', '', '', '']

const plan = (extra: Record<string, string> = {}) => {
  const header = [...STORE_COLUMNS, ...Object.keys(extra)]
  const cells = [...base, ...Object.values(extra)]
  return planStoreRow(rowOf(2, header, cells, (byName) => byName.store_code ?? ''))
}
const dataOf = (result: ReturnType<typeof plan>) =>
  (result as unknown as { data: Record<string, unknown> }).data

describe('planStoreRow: region and flagship', () => {
  it('reads both columns, case-insensitively', () => {
    const data = dataOf(plan({ region: ' Ubud ', flagship: 'YES' }))
    expect(data).toMatchObject({ region: 'ubud', flagship: true })
    expect(dataOf(plan({ region: 'CANGGU', flagship: 'no' }))).toMatchObject({
      region: 'canggu',
      flagship: false,
    })
  })

  it('an empty region cell clears the region; an empty flagship cell stays out', () => {
    const data = dataOf(plan({ region: '', flagship: '' }))
    expect(data.region).toBeNull()
    expect('flagship' in data).toBe(false)
  })

  it('refuses a region that is not one of the four, and a bad flagship', () => {
    for (const region of ['bali', 'other']) {
      expect(plan({ region })).toMatchObject({
        problems: [{ column: 'region', problem: expect.stringContaining('lombok, ubud') }],
      })
    }
    expect(plan({ flagship: 'maybe' })).toMatchObject({
      problems: [{ column: 'flagship' }],
    })
  })

  it('a sheet without the columns leaves region and flagship out of the data', () => {
    const data = dataOf(plan())
    expect('region' in data).toBe(false)
    expect('flagship' in data).toBe(false)
  })
})

describe('the stores header', () => {
  const file = (header: readonly string[]) =>
    new TextEncoder().encode(header.join(',') + '\n' + header.map(() => 'x').join(',') + '\n')

  it('accepts an old sheet and one with the optional columns, and refuses a missing required one', () => {
    const template = [...STORE_COLUMNS]
    expect(() => parseCsv('a.csv', file(template), 'stores', STORE_COLUMNS)).not.toThrow()
    expect(() =>
      parseCsv('a.csv', file([...template, ...STORE_OPTIONAL_COLUMNS]), 'stores', STORE_COLUMNS),
    ).not.toThrow()
    expect(() =>
      parseCsv('a.csv', file(template.filter((c) => c !== 'lat')), 'stores', STORE_COLUMNS),
    ).toThrow(/lat is missing/)
  })
})
