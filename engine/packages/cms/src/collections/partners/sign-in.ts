/**
 * A partner's sign-in (the redesign of 2026-10-20: "Already a partner — sign in"). The owner turns
 * it on for an approved reseller, gives the address they sign in with and sets a password; the shop
 * keeps only its scrypt hash (`./partner-password`). Partners are not Payload users and never reach
 * the admin: the shop signs them in with its own cookie (`apps/web/src/server/shop/partners`).
 *
 * - **Password policy** as for staff (SECURITY.md A2): at least 12 characters, not a common one.
 * - **Lockout** as for staff (A3): five failed sign-ins lock the account for 15 minutes; the owner
 *   unlocks it sooner by clearing "Locked until" or setting a new password.
 * - **Sessions end server-side** (A5): a new password, turning sign-in off or the partner's own
 *   sign-out bumps `sessionVersion`, and every cookie carrying an older one is refused.
 */
import { ValidationError, type CollectionBeforeChangeHook, type Field } from 'payload'

import { PASSWORD_MESSAGES, passwordProblem } from '../users/password-policy'
import { hashPartnerPassword } from './partner-password'

/** Never sent to anyone, the owner included: the hash and the counters the sign-in keeps. */
const hidden = { read: () => false } as const

export const signInFields: Field[] = [
  {
    name: 'signIn',
    type: 'group',
    label: { en: 'Partner sign-in', id: 'Login mitra' },
    admin: {
      description: {
        en: 'Lets an approved partner sign in on the shop’s partnership page. They never see this admin.',
        id: 'Mengizinkan mitra yang disetujui login di halaman kemitraan toko. Mereka tidak pernah melihat admin ini.',
      },
    },
    fields: [
      {
        name: 'enabled',
        type: 'checkbox',
        defaultValue: false,
        label: { en: 'Can sign in', id: 'Boleh login' },
      },
      {
        name: 'email',
        type: 'email',
        unique: true,
        index: true,
        label: { en: 'Sign-in email', id: 'Email login' },
      },
      {
        name: 'newPassword',
        type: 'text',
        virtual: true,
        maxLength: 200,
        label: { en: 'Set a new password', id: 'Atur kata sandi baru' },
        admin: {
          autoComplete: 'new-password',
          description: {
            en: 'At least 12 characters. Saving signs the partner out everywhere.',
            id: 'Minimal 12 karakter. Menyimpan akan mengeluarkan mitra dari semua perangkat.',
          },
        },
      },
      {
        name: 'lockedUntil',
        type: 'date',
        label: { en: 'Locked until', id: 'Terkunci sampai' },
        admin: {
          date: { pickerAppearance: 'dayAndTime' },
          description: {
            en: 'Set after five wrong passwords. Clear it to unlock now.',
            id: 'Terisi setelah lima kali salah kata sandi. Kosongkan untuk membuka sekarang.',
          },
        },
      },
      { name: 'passwordHash', type: 'text', access: hidden, admin: { hidden: true } },
      {
        name: 'failedAttempts',
        type: 'number',
        defaultValue: 0,
        access: hidden,
        admin: { hidden: true },
      },
      {
        name: 'sessionVersion',
        type: 'number',
        defaultValue: 0,
        access: hidden,
        admin: { hidden: true },
      },
    ],
  },
]

type SignInData = {
  enabled?: boolean | null
  email?: string | null
  newPassword?: string | null
  lockedUntil?: string | null
  passwordHash?: string | null
  failedAttempts?: number | null
  sessionVersion?: number | null
}

/**
 * Hashes a new password (refusing a weak one), lower-cases the sign-in address, and bumps the
 * session version whenever access changes, so an old cookie stops working at once.
 */
export const applySignIn: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const next = { ...((data.signIn ?? {}) as SignInData) }
  const before = ((originalDoc as { signIn?: SignInData } | undefined)?.signIn ?? {}) as SignInData
  const { newPassword, ...kept } = next
  const out: SignInData = { ...before, ...kept }
  if (typeof out.email === 'string') out.email = out.email.trim().toLowerCase()
  let bump = before.enabled === true && out.enabled !== true
  if (typeof newPassword === 'string' && newPassword !== '') {
    const problem = passwordProblem(newPassword)
    if (problem !== null) {
      const language = req?.i18n?.language === 'id' ? 'id' : 'en'
      throw new ValidationError(
        {
          collection: 'partners',
          errors: [{ path: 'signIn.newPassword', message: PASSWORD_MESSAGES[problem][language] }],
        },
        req?.t,
      )
    }
    out.passwordHash = await hashPartnerPassword(newPassword)
    out.failedAttempts = 0
    out.lockedUntil = null
    bump = true
  }
  if (bump) out.sessionVersion = (before.sessionVersion ?? 0) + 1
  return { ...data, signIn: out }
}
