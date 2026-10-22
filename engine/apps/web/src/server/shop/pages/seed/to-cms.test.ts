import { describe, expect, it } from 'vitest'

import { createHref, SITES, type SiteLocale } from '@engine/config/sites'

import { defaultHomeBlocks } from '../../../../sites/shop/blocks/defaults/home'
import { defaultPartnershipBlocks } from '../../../../sites/shop/blocks/defaults/partnership'
import { defaultStoresBlocks } from '../../../../sites/shop/blocks/defaults/stores'
import { projectBlocks } from '../project'
import { toCmsLayout, withIdsOf } from './to-cms'

const href = createHref(SITES.shop) as (surface: string, params: object, at: SiteLocale) => string
const SURFACES = ['home', 'browse', 'collection', 'partnership', 'stores', 'search', 'tracking']

describe('the built-in pages, written to the CMS and read back', () => {
  for (const locale of ['en', 'id'] as const) {
    const at = (surface: string) => href(surface, {}, locale)
    const surfaceOf = (address: string) => SURFACES.find((s) => at(s) === address) ?? null
    const pages = {
      home: defaultHomeBlocks(locale, at),
      partnership: defaultPartnershipBlocks(locale),
      stores: defaultStoresBlocks(locale),
    }
    for (const [name, blocks] of Object.entries(pages)) {
      it(`${name} (${locale}) draws exactly as the built-in page`, () => {
        const rows = toCmsLayout(blocks, surfaceOf).map((row, index) => ({
          ...row,
          id: blocks[index]!.id,
        }))
        expect(projectBlocks(rows, at)).toEqual(blocks)
      })
    }
  }
})

describe('the second language on the first’s rows', () => {
  it('keeps every row id, at every depth', () => {
    const saved = [{ id: 'a', blockType: 'steps', steps: [{ id: 's1', title: 'One' }] }]
    const next = [{ blockType: 'steps', steps: [{ title: 'Satu' }] }]
    expect(withIdsOf(saved, next)).toEqual([
      { id: 'a', blockType: 'steps', steps: [{ id: 's1', title: 'Satu' }] },
    ])
  })
})
