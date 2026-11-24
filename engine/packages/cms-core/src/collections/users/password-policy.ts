/**
 * Password policy (SECURITY.md A2; F-03): at least 12 characters and not a common password.
 * A `beforeValidate` hook, so it holds on create and on every change, whichever path writes —
 * the admin, REST, the Local API. (Payload's reset-password writes the hash directly, with no
 * hooks; the owner sets a password here, and a reset link is the owner's to send.)
 */
import { ValidationError, type CollectionBeforeValidateHook } from 'payload'

import { USERS_SLUG } from '../../access/roles'
import { isCommonPassword } from './common-passwords'

export const MIN_PASSWORD_LENGTH = 12

export const PASSWORD_MESSAGES = {
  short: {
    en: `Use at least ${MIN_PASSWORD_LENGTH} characters for the password.`,
    id: `Gunakan kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter.`,
  },
  common: {
    en: 'That password is too common. Choose one that is harder to guess.',
    id: 'Kata sandi itu terlalu umum. Pilih yang lebih sulit ditebak.',
  },
} as const

export function passwordProblem(password: unknown): 'short' | 'common' | null {
  if (typeof password !== 'string' || password === '') return null
  if (password.length < MIN_PASSWORD_LENGTH) return 'short'
  return isCommonPassword(password) ? 'common' : null
}

export const enforcePasswordPolicy: CollectionBeforeValidateHook = ({ data, req, originalDoc }) => {
  const problem = passwordProblem((data as { password?: unknown } | undefined)?.password)
  if (problem === null) return data
  const language = req?.i18n?.language === 'id' ? 'id' : 'en'
  const id = (originalDoc as { id?: number | string } | undefined)?.id
  throw new ValidationError(
    {
      collection: USERS_SLUG,
      ...(id === undefined ? {} : { id }),
      errors: [{ path: 'password', message: PASSWORD_MESSAGES[problem][language] }],
    },
    req?.t,
  )
}
