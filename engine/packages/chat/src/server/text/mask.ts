/**
 * Contact details out of the visitor's text before it reaches the model or the transcript (AI.md
 * §2.1 step 2, §3.4): an email address becomes `[email shared]`, a phone number `[phone shared]`,
 * a street address `[address shared]` (a "Jalan …" / "Gang …" name, or a house number before a
 * street word such as Street or Road).
 * The chat answers a masked message by offering the lead form, which posts the details straight to
 * the server. Years and ranges ("1726–1750", "c. 1700") are not phone numbers and stay.
 */
import 'server-only'

export const EMAIL_MASK = '[email shared]'
export const PHONE_MASK = '[phone shared]'
export const ADDRESS_MASK = '[address shared]'

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/gi
/** A run that starts with `+` or a digit, of digits joined by single separators. */
const PHONE_CANDIDATE = /(?<![\w+])\+?\(?\d(?:[\s().-]?\d){6,17}(?!\w)/g

const STREET_NAME = String.raw`[A-Z][\w.'’-]*(?:\s+[A-Z0-9][\w.'’-]*){0,4}`
const ADDRESS = new RegExp(
  [
    // Indonesian: "Jl. Raya Ubud No. 12", "14 Jalan Monkey Forest", "Gg. Sunset 3".
    String.raw`(?:\b\d{1,5}[A-Za-z]?\s+)?\b(?:Jalan|Jln\.?|Jl\.?|Gang|Gg\.?)\s+${STREET_NAME}(?:,?\s*(?:No\.?|Nomor)\s*\d+[A-Za-z]?)?`,
    // English: "22 Armenian Street", "5 King's Road", "10B High St".
    String.raw`\b\d{1,5}[A-Za-z]?\s+(?:[A-Z][\w'’-]*\s+){1,4}(?:Street|St\.?|Road|Rd\.?|Avenue|Ave\.?|Lane|Ln\.?|Drive|Dr\.?|Boulevard|Blvd\.?|Close|Crescent|Way)(?![\w])`,
  ].join('|'),
  'g',
)

function looksLikePhone(candidate: string): boolean {
  const digits = candidate.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return false
  if (candidate.trimStart().startsWith('+')) return true
  if (digits.startsWith('0')) return digits.length >= 9
  return digits.length >= 10
}

export type Masked = {
  readonly text: string
  readonly email: boolean
  readonly phone: boolean
  readonly address: boolean
}

export function maskContactDetails(text: string): Masked {
  let email = false
  let phone = false
  let address = false
  const withoutEmail = text.replace(EMAIL, () => {
    email = true
    return EMAIL_MASK
  })
  const withoutAddress = withoutEmail.replace(ADDRESS, () => {
    address = true
    return ADDRESS_MASK
  })
  const masked = withoutAddress.replace(PHONE_CANDIDATE, (candidate) => {
    if (!looksLikePhone(candidate)) return candidate
    phone = true
    return PHONE_MASK
  })
  return { text: masked, email, phone, address }
}
