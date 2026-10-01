/** The spike's message keys and neutral defaults (apps own keys, brands own words — BRANDS.md §2). */
import type { LocaleCode } from '@engine/config/schema'
import { defineMessages, type Messages } from '@engine/i18n'
import { loadMessages } from '@engine/i18n/copy'

import { currentBrand } from '../shell/brand'

export const SPIKE_MESSAGES = defineMessages({
  'spike.record': 'No. {id} · edition {edition} · computed {at}',
  'spike.shipTo.legend': 'Ship to',
  'spike.shipTo.submit': 'Update',
  'spike.shipTo.set': 'Shipping to {country}: prices in {currency}.',
  'spike.shipTo.refused': 'That destination is not one we deliver to.',
  'spike.panel.title': 'Availability',
  'spike.panel.checking': 'Checking availability…',
  'spike.panel.available': 'Available — priced in {currency} for delivery to {country}.',
  'spike.panel.sold': 'Sold.',
  'spike.bag.title': 'Your bag',
  'spike.bag.empty': 'Your bag is empty.',
  'spike.bag.remove': 'Remove',
  'spike.bag.removeLine': 'Remove {title}',
  'spike.bag.removed': 'Removed No. {id} from your bag.',
  'spike.bag.unchanged': 'That line was not in your bag.',
  'spike.controls.title': 'Spike controls',
  'spike.controls.sell': 'Mark No. {id} sold',
  'spike.controls.release': 'Mark No. {id} available',
  'spike.controls.edit': 'Edit No. {id}',
  'spike.js.off': 'JavaScript: off',
  'spike.js.on': 'JavaScript: on',
})

export type SpikeMessageKey = keyof typeof SPIKE_MESSAGES

export async function spikeMessages(locale: LocaleCode): Promise<Messages<SpikeMessageKey>> {
  const { config, paths } = await currentBrand()
  return loadMessages({
    defaults: SPIKE_MESSAGES,
    locale,
    defaultLocale: config.locales.default,
    copyDir: paths.copyDir,
  })
}
