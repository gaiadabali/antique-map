/**
 * The words the partnership form's client island needs, as plain strings. The page builds them on
 * the server from the lexicon (`partnershipText`) and hands them across — a function cannot cross
 * into a client component, and the island must not import the whole message table.
 */
import { CONSENT_VERSION } from './state'

export const FORM_TEXT_KEYS = [
  'partnership.formEyebrow',
  'partnership.formName',
  'partnership.formEmail',
  'partnership.formWhatsapp',
  'partnership.formWhatsappHint',
  'partnership.formContactNote',
  'partnership.formMessage',
  'partnership.formConsent',
  'partnership.formConsentVersion',
  'partnership.formSubmit',
  'partnership.formSending',
  'partnership.formReplyNote',
  'partnership.formChecking',
  'partnership.formSuccessTitle',
  'partnership.formSuccessBody',
  'partnership.formUnavailable',
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
      key === 'partnership.formConsentVersion' ? t(key, { version: CONSENT_VERSION }) : t(key),
    ]),
  ) as FormText
}
