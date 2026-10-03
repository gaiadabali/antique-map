/**
 * Contact details out of the visitor's text before it reaches the model or the transcript (AI.md
 * §2.1 step 2, §3.4): an email address becomes `[email shared]`, a phone number `[phone shared]`.
 * The chat answers a masked message by offering the lead form, which posts the details straight to
 * the server. Years and ranges ("1726–1750", "c. 1700") are not phone numbers and stay.
 */
import 'server-only'

export const EMAIL_MASK = '[email shared]'
export const PHONE_MASK = '[phone shared]'

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/gi
/** A run that starts with `+` or a digit, of digits joined by single separators. */
const PHONE_CANDIDATE = /(?<![\w+])\+?\(?\d(?:[\s().-]?\d){6,17}(?!\w)/g

function looksLikePhone(candidate: string): boolean {
  const digits = candidate.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return false
  if (candidate.trimStart().startsWith('+')) return true
  if (digits.startsWith('0')) return digits.length >= 9
  return digits.length >= 10
}

export type Masked = { readonly text: string; readonly email: boolean; readonly phone: boolean }

export function maskContactDetails(text: string): Masked {
  let email = false
  let phone = false
  const withoutEmail = text.replace(EMAIL, () => {
    email = true
    return EMAIL_MASK
  })
  const masked = withoutEmail.replace(PHONE_CANDIDATE, (candidate) => {
    if (!looksLikePhone(candidate)) return candidate
    phone = true
    return PHONE_MASK
  })
  return { text: masked, email, phone }
}
