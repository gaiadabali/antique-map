/** The words a page's Video and PDF link blocks add of their own: keys and defaults here, values in the shop's lexicon. */
import { createMessages, defineMessages, type Messages } from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { SITE_COPY } from '../../../shell/copy'

export const BLOCK_KEYS = defineMessages({
  'blocks.video.about': 'About this video',
  'blocks.video.fallback': 'Your browser cannot play this video here.',
  'blocks.video.download': 'Download the video',
  'blocks.document.meta': 'PDF, {size}',
  'blocks.document.metaNoSize': 'PDF',
  'blocks.document.newTab': 'opens in a new tab',
})

export type BlockMessageKey = keyof typeof BLOCK_KEYS

export type BlockText = (key: BlockMessageKey, params?: Record<string, string | number>) => string

export function blockText(locale: SiteLocale): BlockText {
  const messages: Messages<BlockMessageKey> = createMessages({
    defaults: BLOCK_KEYS,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.shop,
  })
  return messages.t.bind(messages) as BlockText
}

/** A file's size as the visitor's language writes it: "2.1 MB", "2,1 MB". */
export function sizeLabel(bytes: number, locale: SiteLocale): string {
  const format = (value: number) =>
    new Intl.NumberFormat(locale === 'id' ? 'id-ID' : 'en-GB', { maximumFractionDigits: 1 }).format(
      value,
    )
  if (bytes >= 1e6) return `${format(bytes / 1e6)} MB`
  return `${format(Math.max(1, Math.round(bytes / 1e3)))} kB`
}
