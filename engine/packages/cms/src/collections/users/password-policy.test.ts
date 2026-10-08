import { describe, expect, it } from 'vitest'

import { isCommonPassword } from './common-passwords'
import { Users } from './index'
import { enforcePasswordPolicy, passwordProblem } from './password-policy'

describe('the password policy (A2, F-03)', () => {
  it('refuses under 12 characters and common passwords, accepts a long unusual one', () => {
    expect(passwordProblem('short')).toBe('short')
    expect(passwordProblem('elevenchars')).toBe('short')
    expect(passwordProblem('password1234')).toBe('common')
    expect(passwordProblem('Password1234!')).toBe('common')
    expect(passwordProblem('qwertyuiop123')).toBe('common')
    expect(passwordProblem('violet-harbour-lamp-42')).toBeNull()
    expect(passwordProblem(undefined)).toBeNull() // no password in this change
    expect(isCommonPassword('Tr0ub4dor-and-3-pears')).toBe(false)
  })

  it('is wired as a beforeValidate hook that throws a field error in both languages', () => {
    expect(Users.hooks?.beforeValidate).toContain(enforcePasswordPolicy)
    const run = (language: string): string | undefined => {
      try {
        enforcePasswordPolicy({
          data: { password: 'short' },
          req: { i18n: { language }, t: (key: string) => key },
          operation: 'create',
          collection: Users,
          context: {},
        } as never)
      } catch (error) {
        return (error as { data: { errors: Array<{ message: string }> } }).data.errors[0]?.message
      }
      return undefined
    }
    expect(run('en')).toMatch(/at least 12/)
    expect(run('id')).toMatch(/minimal 12/)
  })

  it('keeps the session at 8 hours (A6, F-04)', () => {
    expect((Users.auth as { tokenExpiration?: number }).tokenExpiration).toBe(28800)
  })
})
