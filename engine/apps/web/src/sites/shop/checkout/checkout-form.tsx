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
 *
 * A refusal of any kind (out of stock, invalid details, price changed, …) runs through
 * `useActionState`, and React 19 resets the `<form>`'s uncontrolled fields once the action
 * settles — wiping every word the buyer typed (6-followup-4 #3, found on staging by 7.4). The
 * server action echoes back what it received (`SubmitState.values`, never a price); this form
 * keeps a `submissionId` that only changes once a *new* refusal state arrives, and uses it as each
 * field's `key` so React mounts fresh nodes with the echoed `defaultValue` instead of the native
 * reset's blank one — the pin is restored from the echoed lat/lng the same way. A `startTransition`
 * submit was the other option the ticket offered; this one was simpler to keep the form
 * uncontrolled (6.6.c) while still reusing `useActionState`'s pending flag for the button.
 */
import { useActionState, useCallback, useEffect, useRef, useState } from 'react'

import { Button, FormMessage, Input, Textarea } from '../../../shared/ui'
import { submitOrderAction, type SubmitState } from '../../../server/shop/checkout/actions'
import styles from './checkout.module.css'
import { PinGroup } from './pin-group'
import type { Pin } from './pin-picker'

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
  readonly invalidPin: string
}

export type CheckoutFormProps = {
  readonly locale: 'en' | 'id'
  readonly labels: CheckoutFormLabels
  /** `GOOGLE_MAPS_BROWSER_KEY`, read on the server; `null` in dev and CI. */
  readonly browserKey: string | null
  /** The total the review rendered, before a pin has been quoted. */
  readonly expectedTotalIdr: number
  /** Rendering only: lets a test show a refusal state without actually running the action. */
  readonly initialState?: SubmitState | null
}

type FieldName =
  'contact.name' | 'contact.whatsapp' | 'contact.email' | 'delivery.address' | 'delivery.pin'

export function CheckoutForm({
  locale,
  labels,
  browserKey,
  expectedTotalIdr,
  initialState = null,
}: CheckoutFormProps): React.ReactElement {
  const [state, submit, pendingSubmit] = useActionState(submitOrderAction, initialState)
  const [pin, setPin] = useState<Pin | null>(
    initialState !== null && initialState.values.lat !== null && initialState.values.lng !== null
      ? { lat: initialState.values.lat, lng: initialState.values.lng }
      : null,
  )
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

  // One id per *new* refusal state — not per render — used as every field's `key` so a refusal
  // remounts them with the echoed `defaultValue` instead of the form reset's blank one.
  const lastState = useRef(state)
  const submissionCount = useRef(0)
  const [submissionId, setSubmissionId] = useState(0)
  useEffect(() => {
    if (state === lastState.current) return
    lastState.current = state
    submissionCount.current += 1
    setSubmissionId(submissionCount.current)
    if (state !== null && state.values.lat !== null && state.values.lng !== null) {
      setPin({ lat: state.values.lat, lng: state.values.lng })
    }
  }, [state])

  const bad = (field: FieldName): string | undefined =>
    state !== null && state.fields.includes(field) ? labels.invalidDetails : undefined
  const pinInvalid = state !== null && state.fields.includes('delivery.pin')
  const values = state?.values

  return (
    <form action={submit} className={styles.form} aria-label={labels.deliveryTitle}>
      {state !== null && <FormMessage tone="error">{state.message}</FormMessage>}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{labels.contactTitle}</h2>
        <Input
          key={`name-${submissionId}`}
          id="checkout-name"
          name="name"
          label={labels.fullName}
          hint={labels.fullNameHint}
          error={bad('contact.name')}
          autoComplete="name"
          defaultValue={values?.name}
          required
        />
        <Input
          key={`whatsapp-${submissionId}`}
          id="checkout-whatsapp"
          name="whatsapp"
          type="tel"
          label={labels.whatsapp}
          hint={labels.whatsappHint}
          error={bad('contact.whatsapp')}
          autoComplete="tel"
          defaultValue={values?.whatsapp}
          required
        />
        <Input
          key={`email-${submissionId}`}
          id="checkout-email"
          name="email"
          type="email"
          label={labels.email}
          error={bad('contact.email')}
          autoComplete="email"
          defaultValue={values?.email}
          required
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{labels.deliveryTitle}</h2>
        <Input
          key={`address-${submissionId}`}
          id="checkout-address"
          name="address"
          label={labels.address}
          error={bad('delivery.address')}
          autoComplete="street-address"
          defaultValue={values?.address}
          required
        />
        <input type="hidden" name="locale" defaultValue={locale} />
        <input
          key={`lat-${submissionId}`}
          ref={latRef}
          type="hidden"
          name="lat"
          defaultValue={pin?.lat ?? ''}
        />
        <input
          key={`lng-${submissionId}`}
          ref={lngRef}
          type="hidden"
          name="lng"
          defaultValue={pin?.lng ?? ''}
        />
        <input type="hidden" name="expectedTotalIdr" defaultValue={expectedTotalIdr} />
        <PinGroup
          title={labels.mapPinRequired}
          invalidMessage={labels.invalidPin}
          invalid={pinInvalid}
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
        <Textarea
          key={`notes-${submissionId}`}
          id="checkout-notes"
          name="notes"
          label={labels.notes}
          rows={2}
          defaultValue={values?.notes}
        />
        <Textarea
          key={`gift-${submissionId}`}
          id="checkout-gift"
          name="giftNote"
          label={labels.giftNote}
          rows={2}
          defaultValue={values?.giftNote}
        />
      </section>

      <div className={styles.submit}>
        <Button type="submit" loading={pendingSubmit}>
          {pendingSubmit ? labels.placing : labels.continueToPayment}
        </Button>
      </div>
    </form>
  )
}
