/**
 * The maker's sort line, derived (the field is required; the old site never stated one): surname
 * first, particles ride with the surname, a trailing parenthetical stays with the given name, an
 * office's name sorts as it is.
 */
import { describe, expect, it } from 'vitest'

import { sortNameOf } from './seed'

describe('sortNameOf', () => {
  it('sorts surname first, upper', () => {
    expect(sortNameOf('Abraham Ortelius')).toBe('ORTELIUS, Abraham')
    expect(sortNameOf('Willem Janszoon Blaeu')).toBe('BLAEU, Willem Janszoon')
  })

  it('lets a particle ride with the surname', () => {
    expect(sortNameOf('Guillaume de L’ Isle')).toBe('DE L’ ISLE, Guillaume')
    expect(sortNameOf('Jan Huyghen van Linschoten')).toBe('VAN LINSCHOTEN, Jan Huyghen')
  })

  it('keeps a trailing parenthetical with the given name', () => {
    expect(sortNameOf('Claudius Ptolemaeus (Ptolemy)')).toBe('PTOLEMAEUS, Claudius (Ptolemy)')
    expect(sortNameOf('James Cook (Captain)')).toBe('COOK, James (Captain)')
  })

  it('sorts an organisation’s name as it is', () => {
    expect(sortNameOf('British Admiralty Hydrographic Office')).toBe(
      'British Admiralty Hydrographic Office',
    )
    expect(sortNameOf('Woodbury & Page')).toBe('Woodbury & Page')
  })

  it('leaves a name that is already a sort line alone', () => {
    expect(sortNameOf('VALENTIJN, François')).toBe('VALENTIJN, François')
  })
})
