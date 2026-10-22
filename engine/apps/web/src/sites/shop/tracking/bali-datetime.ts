/**
 * A tracking step's time as the buyer reads it: day, month and time in Bali's own zone, WITA,
 * whatever host the process runs on (the payment deadline's rule, `../payment/bali-time`).
 */
const FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Makassar',
}

/** "6 Oct, 21:31 WITA" for an ISO timestamp, in `locale`; `undefined` for none or an unreadable one. */
export function baliDateTime(iso: string | null, locale: 'en' | 'id'): string | undefined {
  if (iso === null) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  const tag = locale === 'id' ? 'id-ID' : 'en-GB'
  return `${new Intl.DateTimeFormat(tag, FORMAT).format(date)} WITA`
}
