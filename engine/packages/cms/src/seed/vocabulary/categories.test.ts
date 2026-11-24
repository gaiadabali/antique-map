/**
 * Today's one database holds the shop's categories beside the gallery's subject terms (DATA.md §2):
 * the six the shop catalogue names (`@engine/cms-shop/seed`) are seeded and match no subject term,
 * so a design's category and an antique's subject never fold to the same word.
 */
import { categorySeeds } from '@engine/cms-shop/seed'
import { describe, expect, it } from 'vitest'

import { subjectSeeds } from './seed'

const CATALOGUE = ['Maps', 'Travel posters', 'Bali', 'Animals', 'Botanicals', 'Landscapes']

describe("the shop catalogue's categories beside the gallery subjects", () => {
  it('are seeded and match no subject term', () => {
    const subjects = new Set(subjectSeeds().map((subject) => subject.label.toLowerCase()))
    const seeded = new Set(categorySeeds().map((seed) => seed.label))
    for (const label of CATALOGUE) {
      expect(seeded.has(label), label).toBe(true)
      expect(subjects.has(label.toLowerCase()), label).toBe(false)
    }
  })
})
