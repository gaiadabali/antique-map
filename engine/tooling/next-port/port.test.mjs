import { describe, expect, it } from 'vitest'

import { DEFAULT_PORT, resolvePort } from './port.mjs'

describe('resolvePort', () => {
  it('takes the shell first', () => {
    expect(resolvePort({ PORT: '4100' }, 'PORT=4732\n')).toBe('4100')
  })

  it('then the app’s .env.local', () => {
    expect(resolvePort({}, '# local\nDB_SUFFIX=dev\nPORT=4732\n')).toBe('4732')
  })

  it('falls back to 3000 when neither names one, an empty PORT= included', () => {
    expect(resolvePort({}, '')).toBe(DEFAULT_PORT)
    expect(resolvePort({ PORT: '  ' }, 'PORT=\n')).toBe('3000')
  })

  it('refuses a value that is not a port', () => {
    expect(() => resolvePort({ PORT: 'abc' }, '')).toThrow(/PORT in the shell/)
    expect(() => resolvePort({}, 'PORT=70000\n')).toThrow(/PORT in .env.local/)
  })
})
