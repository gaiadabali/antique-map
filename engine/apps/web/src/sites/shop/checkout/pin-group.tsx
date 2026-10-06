'use client'

/**
 * The checkout's pin group (6-followup-4 #2): the "Pin your delivery spot" heading, the picker,
 * and — when the server refuses `delivery.pin` — the invalid-pin message on the group itself.
 * `lat`/`lng` are hidden fields, so `state.fields` naming them alone would mark no visible field.
 */
import { PinPicker, type Pin, type PinPickerLabels } from './pin-picker'
import styles from './checkout.module.css'

export type PinGroupProps = {
  readonly title: string
  readonly invalidMessage: string
  readonly invalid: boolean
  readonly browserKey: string | null
  readonly labels: PinPickerLabels
  readonly pin: Pin | null
  readonly address: string | null
  readonly onPin: (pin: Pin | null, address: string | null) => void
}

const ERROR_ID = 'checkout-pin-error'
const LABEL_ID = 'checkout-pin-label'

export function PinGroup({
  title,
  invalidMessage,
  invalid,
  browserKey,
  labels,
  pin,
  address,
  onPin,
}: PinGroupProps): React.ReactElement {
  return (
    <div
      className={styles.pinGroup}
      role="group"
      aria-labelledby={LABEL_ID}
      aria-invalid={invalid ? 'true' : undefined}
      aria-describedby={invalid ? ERROR_ID : undefined}
    >
      <p id={LABEL_ID} className={styles.sectionTitle}>
        {title}
      </p>
      <PinPicker
        browserKey={browserKey}
        labels={labels}
        pin={pin}
        address={address}
        onPin={onPin}
        invalid={invalid}
        errorId={invalid ? ERROR_ID : undefined}
      />
      {invalid && (
        <p id={ERROR_ID} className={styles.pinError} role="alert">
          {invalidMessage}
        </p>
      )}
    </div>
  )
}
