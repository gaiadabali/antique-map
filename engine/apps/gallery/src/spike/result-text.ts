/** A kept post outcome's code as the visitor reads it (C13 `FORM_RESULT`: a code, never an entry). */
import type { Messages } from '@engine/i18n'

import type { SpikeMessageKey } from './messages'
import type { ShipToOption } from './ship-to'

export function resultText(
  code: string,
  t: Messages<SpikeMessageKey>['t'],
  options: readonly ShipToOption[],
): string {
  const [kind, value = ''] = code.split(':')
  switch (kind) {
    case 'shipTo.set': {
      const option = options.find((each) => each.country === value)
      return option
        ? t('spike.shipTo.set', { country: option.country, currency: option.currency })
        : t('spike.shipTo.refused')
    }
    case 'bag.removed':
      return t('spike.bag.removed', { id: value })
    case 'bag.unchanged':
      return t('spike.bag.unchanged')
    default:
      return t('spike.shipTo.refused')
  }
}
