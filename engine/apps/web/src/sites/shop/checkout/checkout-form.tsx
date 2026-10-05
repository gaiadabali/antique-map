'use client'

/**
 * The checkout form (TASKS.md 6.3.a; COMMERCE.md §3): contact, address, the pin and the notes,
 * posting to the submit server action — a plain form, so it works without JavaScript too (the pin
 * needs it: without a key the fallback parses the pasted link or typed coordinates through
 * `/api/x/geocode`). The delivery fee and total shown here come only from the server's fee action
 * (`quoteFeeAction`); the client never computes one. The pay button echoes back, as
 * `expectedTotalIdr`, the total the page last showed.
 */
import { useActionState, useCallback, useState, useTransition } from 'react'

import { Button, FormMessage, Input, Textarea } from '../../../shared/ui'
import type { FeeState } from '../../../server/shop/checkout/actions'
import { quoteFeeAction, submitOrderAction } from '../../../server/shop/checkout/actions'
import styles from './checkout.module.css'
import { PinPicker, type Pin } from './pin-picker'

export type CheckoutFormLabels = {
  readonly contactTitle: string
  readonly fullName: string
  readonly fullNameHint: string
  readonly whatsapp: string
  readonly whatsappHint: string
  readonly email: string
  readonly deliveryTitle: string
  readonly address: string
  readonly notes: string
  readonly giftNote: string
  readonly mapPinRequired: string
  readonly pinUseLocation: string
  readonly pinPasteLink: string
  readonly pinLatLng: string
  readonly pinLatitude: string
  readonly pinLongitude: string
  readonly pinSearch: string
  readonly feePlaceholder: string
  readonly deliveryFee: string
  readonly continueToPayment: string
  readonly placing: string
  readonly invalidDetails: string
}

export type CheckoutFormProps = {
  readonly locale: 'en' | 'id'
  readonly labels: CheckoutFormLabels
  /** `GOOGLE_MAPS_BROWSER_KEY`, read on the server; `null` in dev and CI. */
  readonly browserKey: string | null
  /** The total the review rendered, before a pin has been quoted. */
  readonly expectedTotalIdr: number
}

type FieldName =
  'contact.name' | 'contact.whatsapp' | 'contact.email' | 'delivery.address' | 'delivery.pin'

export function CheckoutForm({
  locale,
  labels,
  browserKey,
  expectedTotalIdr,
}: CheckoutFormProps): React.ReactElement {
  const [state, submit, pendingSubmit] = useActionState(submitOrderAction, null)
  const [pin, setPin] = useState<Pin | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [fee, setFee] = useState<FeeState | null>(null)
  const [pendingFee, startFee] = useTransition()

  const onPin = useCallback(
    (next: Pin, nextAddress: string | null) => {
      setPin(next)
      setAddress(nextAddress)
      startFee(async () => {
        setFee(await quoteFeeAction(null, { lat: next.lat, lng: next.lng, locale }))
      })
    },
    [locale],
  )

  const bad = (field: FieldName): string | undefined =>
    state !== null && state.fields.includes(field) ? labels.invalidDetails : undefined

  const shownTotal = fee !== null && fee.ok ? fee.totalIdr : expectedTotalIdr

  return (
    <form action={submit} className={styles.form} aria-label={labels.deliveryTitle}>
      {state !== null && <FormMessage tone="error">{state.message}</FormMessage>}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{labels.contactTitle}</h2>
        <Input
          id="checkout-name"
          name="name"
          label={labels.fullName}
          hint={labels.fullNameHint}
          error={bad('contact.name')}
          autoComplete="name"
          required
        />
        <Input
          id="checkout-whatsapp"
          name="whatsapp"
          type="tel"
          label={labels.whatsapp}
          hint={labels.whatsappHint}
          error={bad('contact.whatsapp')}
          autoComplete="tel"
          required
        />
        <Input
          id="checkout-email"
          name="email"
          type="email"
          label={labels.email}
          error={bad('contact.email')}
          autoComplete="email"
          required
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{labels.deliveryTitle}</h2>
        <Input
          id="checkout-address"
          name="address"
          label={labels.address}
          error={bad('delivery.address')}
          autoComplete="street-address"
          required
        />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="lat" value={pin?.lat ?? ''} />
        <input type="hidden" name="lng" value={pin?.lng ?? ''} />
        <input type="hidden" name="expectedTotalIdr" value={shownTotal} />
        <p className={styles.sectionTitle} aria-label={labels.mapPinRequired}>
          {labels.mapPinRequired}
        </p>
        <PinPicker
          browserKey={browserKey}
          labels={{
            useLocation: labels.pinUseLocation,
            pasteLink: labels.pinPasteLink,
            latLng: labels.pinLatLng,
            latitude: labels.pinLatitude,
            longitude: labels.pinLongitude,
            search: labels.pinSearch,
          }}
          pin={pin}
          address={address}
          onPin={onPin}
        />
        <Textarea id="checkout-notes" name="notes" label={labels.notes} rows={2} />
        <Textarea id="checkout-gift" name="giftNote" label={labels.giftNote} rows={2} />
      </section>

      <div className={styles.fee} aria-live="polite">
        {fee === null ? (
          <p className={styles.feeRow}>{labels.feePlaceholder}</p>
        ) : fee.ok ? (
          <>
            <p className={styles.feeRow}>
              <span>{labels.deliveryFee}</span>
              <span>{fee.feeText}</span>
            </p>
            {fee.sendingFrom !== null && <p className={styles.feeRow}>{fee.sendingFrom}</p>}
            <p className={[styles.feeRow, styles.grand].filter(Boolean).join(' ')}>
              <span>{labels.continueToPayment}</span>
              <span>{fee.totalText}</span>
            </p>
          </>
        ) : (
          <FormMessage tone="error">{fee.message}</FormMessage>
        )}
        {pendingFee && <p className={styles.feeRow}>{labels.placing}</p>}
      </div>

      <div className={styles.submit}>
        <Button type="submit" loading={pendingSubmit}>
          {pendingSubmit ? labels.placing : labels.continueToPayment}
        </Button>
      </div>
    </form>
  )
}
