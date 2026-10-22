import { describe, expect, it } from 'vitest'

import { isLockContention } from './contention'

const pgError = (code: string) => Object.assign(new Error(`pg ${code}`), { code })

describe('isLockContention', () => {
  it('recognises lock_not_available (lock_timeout, NOWAIT) and a deadlock, bare or wrapped', () => {
    expect(isLockContention(pgError('55P03'))).toBe(true)
    expect(isLockContention(pgError('40P01'))).toBe(true)
    expect(isLockContention(new Error('Failed query', { cause: pgError('55P03') }))).toBe(true)
  })

  it('treats every other error, and a non-error, as a defect', () => {
    expect(isLockContention(pgError('23505'))).toBe(false)
    expect(isLockContention(pgError('57014'))).toBe(false)
    expect(isLockContention(new Error('lock timeout'))).toBe(false)
    expect(isLockContention(null)).toBe(false)
    expect(isLockContention('55P03')).toBe(false)
  })
})
