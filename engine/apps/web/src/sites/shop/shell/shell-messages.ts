/**
 * The shop shell's own message keys (the redesign of 2026-10-20: the header's search and bag
 * icons), with their neutral defaults; the values are in `../lexicon/{en,id}.json`. The shared
 * shell's keys stay in `shell/messages.ts`, which the gallery reads too.
 */
import { createMessages, defineMessages } from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { SITE_COPY } from '../../../shell/copy'

export const SHOP_SHELL_MESSAGES = defineMessages({
  'shell.shop.search': 'Search',
  'shell.shop.searchField': 'Search the shop',
  'shell.shop.searchSubmit': 'Search',
  'shell.shop.searchClose': 'Close search',
  'shell.shop.bag': 'Bag',
  'shell.shop.bagCount': 'Bag, {count} items',
  'shell.shop.home': 'Home',
  'shell.shop.breadcrumb': 'Breadcrumb',
})

export type ShopShellMessageKey = keyof typeof SHOP_SHELL_MESSAGES

export type ShopShellText = (key: ShopShellMessageKey, params?: Record<string, string>) => string

/** The shop shell's words for one locale. */
export function shopShellText(locale: SiteLocale): ShopShellText {
  const messages = createMessages({
    defaults: SHOP_SHELL_MESSAGES,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.shop,
  })
  return (key, params) => messages.t(key, params)
}
