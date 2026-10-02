/**
 * The simple rupiah formatter the shared UI exposes for display-only amounts.
 * Money that moves through a transaction still goes through `@engine/i18n/money`.
 */

/** Format a non-negative integer amount of rupiah (IDR has no minor unit). */
export function formatRupiah(amount: number): string {
  if (!Number.isInteger(amount)) {
    throw new RangeError(`rupiah amount must be an integer, got ${amount}`)
  }
  if (amount < 0) {
    throw new RangeError(`rupiah amount must be non-negative, got ${amount}`)
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
