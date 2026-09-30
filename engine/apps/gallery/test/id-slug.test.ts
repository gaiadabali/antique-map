/** The item route reads only the id from its segment (the 4.1.e spike: Next hands two spellings). */
import { describe, expect, it } from 'vitest'

import { parsePublicId } from '../src/spike/id-slug'

describe('parsePublicId()', () => {
  it.each([
    ['1706-caf%C3%A9-de-java', 1706],
    ['1706-café-de-java', 1706],
    ['1726-b%2561li', 1726],
    ['1726', 1726],
    ['1706-van-t%27hoff', 1706],
  ])('%s → %s', (segment, id) => expect(parsePublicId(segment)).toBe(id))

  it.each(['01726-bali', '0', '-1', 'bali', '1726bali', '99999999999999999999-x'])(
    '%s names no item',
    (segment) => expect(parsePublicId(segment)).toBeNull(),
  )
})
