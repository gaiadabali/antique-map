'use client'

/**
 * The checkout form (TASKS.md 6.3.a, 6.6.c; COMMERCE.md §3): contact, address, the pin and the
 * notes, posting to the submit server action — a plain form, so it works without JavaScript too
 * (the pin needs it: without a key the fallback parses the pasted link or typed coordinates
 * through `/api/x/geocode`). There is no delivery fee here any more (staff quote it after the
 * order is placed, COMMERCE.md's 2026-10-06 decision) — the pin still matters, because it is what
 * picks the sending store, but nothing here prices it. The pay button echoes back, as
 * `expectedTotalIdr`, the items total the review showed (items minus discount).
 *
 * The pin's lat/lng hidden fields are read with `FormData` on submit and never reset once set:
 * they carry a plain string `value` from a ref, not a React-controlled one, so a pin a visitor set
 * before hydration finished survives it (6.6.c — found on staging by 7.4).
 */
import { useActionState, useCallback, useRef, useState } from 'react'

import { Button, FormMessage, Input, Textarea } from '../../../shared/ui'
import { submitOrderAction } from '../../../server/shop/checkout/actions'
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
  const latRef = useRef<HTMLInputElement | null>(null)
  const lngRef = useRef<HTMLInputElement | null>(null)

  // The pin's hidden fields are never React-`value`-controlled: hydration would otherwise snap a
  // visitor-set pin back to blank. `onPin` writes the DOM directly instead (6.6.c).
  const onPin = useCallback((next: Pin | null, nextAddress: string | null) => {
    setPin(next)
    setAddress(nextAddress)
    if (latRef.current) latRef.current.value = next === null ? '' : String(next.lat)
    if (lngRef.current) lngRef.current.value = next === null ? '' : String(next.lng)
  }, [])

  const bad = (field: FieldName): string | undefined =>
    state !== null && state.fields.includes(field) ? labels.invalidDetails : undefined

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
        <input type="hidden" name="locale" defaultValue={locale} />
        <input ref={latRef} type="hidden" name="lat" defaultValue={pin?.lat ?? ''} />
        <input ref={lngRef} type="hidden" name="lng" defaultValue={pin?.lng ?? ''} />
        <input type="hidden" name="expectedTotalIdr" defaultValue={expectedTotalIdr} />
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

      <div className={styles.submit}>
        <Button type="submit" loading={pendingSubmit}>
          {pendingSubmit ? labels.placing : labels.continueToPayment}
        </Button>
      </div>
    </form>
  )
}
