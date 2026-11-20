/**
 * The admin's two languages, as the rules a CMS writes speak them — `@engine/cms-core/i18n`: a
 * message in both (`Bilingual`), the language a request's admin is in (`adminLanguage`), and the
 * message in that language (`pickLanguage`). Every validation message a hook throws goes through
 * `pickLanguage`, so an Indonesian admin is refused in Indonesian.
 */
import type { PayloadRequest } from 'payload'

/** A message in both admin languages; `pickLanguage` chooses the one `req.i18n` is set to. */
export type Bilingual = { readonly en: string; readonly id: string }

/** The admin's current language (`req.i18n.language`), 'en' when there is none to read. */
export const adminLanguage = (req: Pick<PayloadRequest, 'i18n'> | undefined): 'en' | 'id' =>
  req?.i18n?.language === 'id' ? 'id' : 'en'

/** `message` in `req`'s admin language; a plain string is already decided, in either. */
export const pickLanguage = (
  req: Pick<PayloadRequest, 'i18n'> | undefined,
  message: Bilingual | string,
): string => (typeof message === 'string' ? message : message[adminLanguage(req)])
