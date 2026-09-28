/**
 * @contract C2 — fixtures `account-entry` (set password, expired link, reset, reset sent) · owner: ARC
 *
 * The account's signed-out pages: an approved partner setting its first password from
 * approval's email, a link that has expired, and asking for another — which answers the same
 * for every email.
 */
import type { AccountVM } from '../surfaces/account'
import { entry, hidden } from './_forms'
import { seo } from './_shared'

const setPasswordPage = { ...seo('Set your password', '/account/set-password'), noindex: true }
const resetPage = { ...seo('Reset your password', '/account/reset'), noindex: true }
const resetForm = {
  fields: [
    entry('email', 'email', { autocomplete: 'email', inputMode: 'email' as const }),
    hidden('returnTo', '/account/reset'),
  ],
  action: '/api/x/auth/reset',
}

export const accountSetPassword: AccountVM = {
  surface: 'account',
  session: {
    kind: 'setPassword',
    reason: 'approval',
    link: {
      state: 'ready',
      email: 'made@shop.example.test',
      form: {
        fields: [
          entry('password', 'password', { autocomplete: 'new-password' }),
          hidden('returnTo', '/account/set-password'),
        ],
        action: '/api/x/auth/password',
      },
      failed: null,
    },
  },
  seo: setPasswordPage,
}

export const accountSetPasswordExpired: AccountVM = {
  surface: 'account',
  session: {
    kind: 'setPassword',
    reason: 'approval',
    link: {
      state: 'expired',
      requestAnother: { label: 'Send a new link', href: '/account/reset' },
    },
  },
  seo: setPasswordPage,
}

export const accountReset: AccountVM = {
  surface: 'account',
  session: { kind: 'reset', form: resetForm, result: null },
  seo: resetPage,
}

/** Sent: the same answer whether or not the email has an account. */
export const accountResetSent: AccountVM = {
  surface: 'account',
  session: {
    kind: 'reset',
    form: resetForm,
    result: { kind: 'received', reply: { code: 'resetLinkSent' } },
  },
  seo: resetPage,
}
