/**
 * @contract C2 — fixture helpers: form fields · owner: ARC
 *
 * Builders for the fixtures' fields, so each states only what differs from the defaults — a
 * required, ungrouped field with nothing to prefill — and the sign-in every page offers.
 */
import type { SignInFormVM } from '../surfaces/account'
import type { CheckboxFieldVM, EntryFieldVM, HiddenFieldVM } from '../surfaces/form'

type Settings = Partial<Omit<EntryFieldVM, 'name' | 'input'>>

export function entry(name: string, input: EntryFieldVM['input'], settings: Settings = {}) {
  const field: EntryFieldVM = {
    name,
    input,
    group: null,
    required: true,
    requiredWhen: null,
    autocomplete: null,
    inputMode: null,
    options: null,
    maxLength: input === 'textarea' ? 2000 : null,
    value: null,
  }
  return { ...field, ...settings }
}

export const optional = (name: string, input: EntryFieldVM['input'], settings: Settings = {}) =>
  entry(name, input, { required: false, ...settings })

export const tick = (name: string, group: string | null, required = false): CheckboxFieldVM => ({
  name,
  input: 'checkbox',
  group,
  required,
  value: 'true',
})

export const hidden = (name: string, value: string): HiddenFieldVM => ({
  name,
  input: 'hidden',
  value,
})

/** A buyer's or a partner's contact, as the C6 requests name it, in the `contact` fieldset. */
export const contactFields = (locale = 'en') => [
  entry('contact.fullName', 'text', { group: 'contact', autocomplete: 'name' }),
  entry('contact.email', 'email', { group: 'contact', autocomplete: 'email', inputMode: 'email' }),
  optional('contact.whatsapp', 'tel', { group: 'contact', autocomplete: 'tel', inputMode: 'tel' }),
  hidden('contact.locale', locale),
]

/** Sign-in as every page offers it (`auth.signIn`), coming back to `returnTo`. */
export function signInForm(returnTo: string): SignInFormVM {
  return {
    fields: [
      entry('email', 'email', { autocomplete: 'username', inputMode: 'email' }),
      entry('password', 'password', { autocomplete: 'current-password' }),
      hidden('returnTo', returnTo),
    ],
    action: '/api/x/auth/sign-in',
    reset: { label: 'Forgot your password?', href: '/account/reset' },
  }
}
