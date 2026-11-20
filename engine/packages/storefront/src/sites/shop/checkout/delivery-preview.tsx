'use client'

/**
 * The delivery line and the total to pay, under the pin (the plan's K2; TASKS.md 27.3): before a
 * pin, a line asking for one; once pinned, the server's fee from the distance bands and the total
 * (`quoteDeliveryAction`) — or, past the last band, the promise that staff confirm the fee, with
 * the items total. Every figure is the server's; this only shows it, and hands the total to the
 * form's `expectedTotalIdr`, which `createOrder` compares and never reads as a price.
 *
 * A pin that moves while a quote is in flight wins: an older answer arriving late is dropped.
 */
import { useEffect, useRef, useState } from 'react'

import { formatRupiah } from '@engine/ui/format-rupiah'
import {
  quoteDeliveryAction,
  type DeliveryPreview as Preview,
} from '../../../server/shop/checkout/quote-action'
import styles from './checkout.module.css'
import type { Pin } from './pin-picker'

export type DeliveryPreviewLabels = {
  readonly delivery: string
  readonly deliveryFree: string
  readonly deliveryPinFirst: string
  readonly deliveryChecking: string
  readonly deliveryStaffQuote: string
  readonly totalToPay: string
}

export type DeliveryPreviewProps = {
  readonly pin: Pin | null
  readonly locale: 'en' | 'id'
  readonly labels: DeliveryPreviewLabels
  /** The items total the review rendered: what is shown and echoed until a pin is quoted. */
  readonly itemsTotalIdr: number
  /** The total the pay button must echo, each time it changes. */
  readonly onTotal: (totalIdr: number) => void
}

export function DeliveryPreview({
  pin,
  locale,
  labels,
  itemsTotalIdr,
  onTotal,
}: DeliveryPreviewProps): React.ReactElement {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [checking, setChecking] = useState(false)
  const latest = useRef(0)

  useEffect(() => {
    if (pin === null) {
      setPreview(null)
      onTotal(itemsTotalIdr)
      return
    }
    const ask = ++latest.current
    setChecking(true)
    quoteDeliveryAction({ lat: pin.lat, lng: pin.lng, locale })
      .then((answer) => {
        if (ask !== latest.current) return
        setPreview(answer)
        onTotal(answer.kind === 'refused' ? itemsTotalIdr : answer.totalIdr)
      })
      .catch(() => {
        if (ask !== latest.current) return
        setPreview(null)
        onTotal(itemsTotalIdr)
      })
      .finally(() => {
        if (ask === latest.current) setChecking(false)
      })
  }, [pin, locale, itemsTotalIdr, onTotal])

  const fee =
    pin === null
      ? labels.deliveryPinFirst
      : checking
        ? labels.deliveryChecking
        : preview?.kind === 'priced'
          ? preview.isFree
            ? labels.deliveryFree
            : formatRupiah(preview.deliveryIdr)
          : preview?.kind === 'staff_quote'
            ? labels.deliveryStaffQuote
            : '—'
  const total =
    preview !== null && preview.kind !== 'refused' && !checking ? preview.totalIdr : itemsTotalIdr

  return (
    <div className={styles.preview} aria-live="polite" data-testid="delivery-preview">
      <dl className={styles.totals}>
        <div className={styles.totalRow}>
          <dt>{labels.delivery}</dt>
          <dd>{fee}</dd>
        </div>
        <div className={[styles.totalRow, styles.grand].join(' ')}>
          <dt>{labels.totalToPay}</dt>
          <dd data-testid="total-to-pay">{formatRupiah(total)}</dd>
        </div>
      </dl>
      {preview?.kind === 'refused' && !checking && (
        <p role="alert" className={styles.refusal}>
          {preview.message}
        </p>
      )}
    </div>
  )
}
