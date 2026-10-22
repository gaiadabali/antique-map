/**
 * The payment deadline, shown as a time, not only a countdown (EXPERIENCE-SHOP.md §6): Bali's own
 * zone, WITA, whatever host the process runs on.
 */
const FORMAT: Record<'en' | 'id', Intl.DateTimeFormatOptions> = {
  en: { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Makassar' },
  id: { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Makassar' },
}

/** "14:32 WITA" for `date`, in `locale`. */
export function baliTime(date: Date, locale: 'en' | 'id'): string {
  const tag = locale === 'id' ? 'id-ID' : 'en-GB'
  return `${new Intl.DateTimeFormat(tag, FORMAT[locale]).format(date)} WITA`
}
