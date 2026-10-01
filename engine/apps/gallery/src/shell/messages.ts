/**
 * The shell's message keys and their neutral defaults (BRANDS.md §2: apps own keys, brands own
 * words). The values are the brand's, from `<brand>/site/copy/<locale>.json`, joined per request
 * by `@engine/i18n`; a key the brand's copy lacks shows its default and is listed as missing, so a
 * gap is visible, never silently another brand's voice.
 */
import { defineMessages, type Messages } from '@engine/i18n'
import { loadMessages } from '@engine/i18n/copy'
import type { LocaleCode } from '@engine/config/schema'

import { currentBrand } from './brand'

export const SHELL_MESSAGES = defineMessages({
  'shell.skipToContent': 'Skip to content',
  'shell.homeLink': '{brand}, home',
  'shell.languages': 'Language',
  'shell.locale.en': 'English',
  'shell.locale.id': 'Bahasa Indonesia',
  'shell.locale.nl': 'Nederlands',
  'shell.contact': 'Contact',
  'home.title': '{brand}',
  'home.lede': 'The storefront is being built. What you see is its frame.',
  'notFound.title': 'Page not found',
  'notFound.body': 'There is nothing at this address.',
  'notFound.home': 'Go to the home page',
})

export type ShellMessageKey = keyof typeof SHELL_MESSAGES

export async function shellMessages(locale: LocaleCode): Promise<Messages<ShellMessageKey>> {
  const { config, paths } = await currentBrand()
  return loadMessages({
    defaults: SHELL_MESSAGES,
    locale,
    defaultLocale: config.locales.default,
    copyDir: paths.copyDir,
  })
}
