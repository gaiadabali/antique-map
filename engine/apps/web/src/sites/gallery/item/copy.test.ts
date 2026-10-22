/**
 * The item page's words (5.2.b): every key this page defines, and every lexicon key it borrows,
 * is in both locales — an `en`-only key would show an Indonesian visitor English defaults.
 */
import { describe, expect, it } from 'vitest'

import en from '../lexicon/en.json'
import id from '../lexicon/id.json'

import { ITEM_PAGE_KEYS } from './copy'

const BORROWED = [
  'price.onRequest',
  'status.sold',
  'status.onHold',
  'label.stockNumber',
  'record.objectType',
  'record.date',
  'record.technique',
  'record.colour',
  'record.dimensions',
  'record.condition',
  'record.condition.defects',
  'record.condition.restoration',
  'record.references',
  'record.provenance',
  'maker.certainty.certain',
  'maker.certainty.attributed',
  'maker.role.cartographer',
  'image.role.recto',
  'image.role.verso',
  'image.synthetic.digital-mockup',
  'objectType.map',
  'colouring.original-hand',
] as const

describe('item lexicon', () => {
  it('every key this page defines is in both locales', () => {
    for (const key of Object.keys(ITEM_PAGE_KEYS)) {
      expect(en, `en missing ${key}`).toHaveProperty([key])
      expect(id, `id missing ${key}`).toHaveProperty([key])
    }
  })

  it('every lexicon key the page borrows is in both locales', () => {
    for (const key of BORROWED) {
      expect(en, `en missing ${key}`).toHaveProperty([key])
      expect(id, `id missing ${key}`).toHaveProperty([key])
    }
  })
})
