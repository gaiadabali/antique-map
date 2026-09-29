/**
 * The commerce rules of `validateBrandConfigs()` (C1's header list): reservation TTLs in the
 * order C8's machines assume, one document sequence per seller, and no provider listed twice.
 */
import type { BrandConfig } from '../../schema'
import type { Report } from '../issues'

export function checkCommerce(
  { commerce, sellers, shipping, fulfilment }: BrandConfig,
  report: Report,
): void {
  const ttl = commerce.ttl
  const at = (field: keyof typeof ttl) => ['commerce', 'ttl', field]
  if (ttl.holdNoticeHours >= ttl.holdDefaultHours) {
    report(
      at('holdNoticeHours'),
      `${ttl.holdNoticeHours} must be below holdDefaultHours (${ttl.holdDefaultHours}): the notice goes out before the hold ends`,
    )
  }
  if (ttl.holdDefaultHours > ttl.holdMaxHours) {
    report(
      at('holdDefaultHours'),
      `${ttl.holdDefaultHours} must not pass holdMaxHours (${ttl.holdMaxHours})`,
    )
  }
  if (ttl.checkoutLockMinutes > ttl.checkoutLockMaxHours * 60) {
    report(
      at('checkoutLockMinutes'),
      `${ttl.checkoutLockMinutes} must fit within checkoutLockMaxHours (${ttl.checkoutLockMaxHours} h)`,
    )
  }

  const prefixes = new Map<string, string>()
  sellers.forEach((seller, i) => {
    const taken = prefixes.get(seller.documentPrefix)
    if (taken !== undefined) {
      report(
        ['sellers', i, 'documentPrefix'],
        `"${seller.documentPrefix}" is seller "${taken}"'s too: each seller numbers its documents in its own gapless sequence (COMMERCE.md §12)`,
      )
    } else {
      prefixes.set(seller.documentPrefix, seller.id)
    }
    reportRepeats(seller.payments, ['sellers', i, 'payments'], report)
  })
  reportRepeats(shipping.providers, ['shipping', 'providers'], report)
  reportRepeats(fulfilment.providers, ['fulfilment', 'providers'], report)
}

function reportRepeats(
  values: readonly string[],
  path: readonly string[] | readonly (string | number)[],
  report: Report,
) {
  values.forEach((value, j) => {
    if (values.indexOf(value) !== j) report([...path, j], `"${value}" is listed twice`)
  })
}
