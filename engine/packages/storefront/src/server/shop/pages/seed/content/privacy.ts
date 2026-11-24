/**
 * The privacy page's first content, seeded once into the CMS (`../pages`) at `/privacy`, which the
 * newsletter pop-up and the partnership form link to: the intro, then one text block per section.
 * The words are `./privacy-text`'s; after the seed the owner edits the page in the admin.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { ShopBlockVM } from '../../blocks'
import { privacyText } from './privacy-text'

export function defaultPrivacyBlocks(locale: SiteLocale): readonly ShopBlockVM[] {
  const text = privacyText(locale)
  return [
    { type: 'text', id: 'privacy-intro', anchor: null, title: null, paragraphs: text.intro },
    ...text.sections.map((section, index): ShopBlockVM => ({
      type: 'text',
      id: `privacy-${index + 1}`,
      anchor: null,
      title: section.title,
      paragraphs: section.paragraphs,
    })),
  ]
}
