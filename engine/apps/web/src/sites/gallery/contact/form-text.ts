/**
 * The words the gallery's lead form island needs, as plain strings (5.3.b). The page builds them
 * on the server from the lexicon (`contactText`) and hands them across — a function cannot cross
 * into a client component, and the island must not import the whole message table.
 */
import { LEAD_CONSENT_VERSION } from './state'

export const FORM_TEXT_KEYS = [
  'contactForm.eyebrow',
  'contactForm.name',
  'contactForm.whatsapp',
  'contactForm.whatsappHint',
  'contactForm.email',
  'contactForm.contactNote',
  'contactForm.message',
  'contactForm.messageSell',
  'contactForm.consent',
  'contactForm.consentVersion',
  'contactForm.submit',
  'contactForm.sending',
  'contactForm.securityCheck',
  'contactForm.successTitle',
  'contactForm.successBody',
  'contactForm.unavailable',
  'lead.error.name',
  'lead.error.message',
  'lead.error.contact',
  'lead.error.whatsapp',
  'lead.error.email',
  'lead.error.consent',
  'lead.error.invalid',
  'lead.error.challenge',
  'lead.error.rate',
  'lead.error.unavailable',
] as const

export type FormTextKey = (typeof FORM_TEXT_KEYS)[number]
export type FormText = Readonly<Record<FormTextKey, string>>

/** The island's words from any `t` that knows these keys; the consent line carries its version. */
export function formText(
  t: (key: FormTextKey, params?: Record<string, string | number>) => string,
): FormText {
  return Object.fromEntries(
    FORM_TEXT_KEYS.map((key) => [
      key,
      key === 'contactForm.consentVersion' ? t(key, { version: LEAD_CONSENT_VERSION }) : t(key),
    ]),
  ) as FormText
}
