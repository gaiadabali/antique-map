/**
 * The partnership form as a pure view of its state (TASKS.md 9.1.c; the redesign of 2026-10-20,
 * the handoff's apply form): "What are you buying for?" as a radio group drawn as chips — a shop, a
 * company, a hotel or villa — which renames three fields, the button and the reply promise (the
 * island keeps the choice; it works without script on the shop's words). The island
 * (`./partnership-form`) feeds it the action's state and `pending`; a test renders it directly.
 * Per-field errors are lexicon keys the server chose, shown under their fields; a refusal that is
 * not a field's (the security check, the rate limit) shows above the button. Tokens and shared
 * components only.
 */
import { Button, FormMessage, Input } from '../../../shared/ui'

import type { FormText } from './form-text'
import styles from './partnership-form.module.css'
import { SEGMENTS, isSegment, type Segment, type SegmentText } from './segment-kinds'
import type { PartnershipState } from './state'
import { TurnstileWidget } from './turnstile-widget'

type Props = {
  readonly text: FormText
  /** The choice's words, for every choice (the field labels change with it). */
  readonly segments: SegmentText
  /** The chosen segment; defaults to the one in the returned values, else a shop. */
  readonly segment?: Segment
  readonly onSegment?: (segment: Segment) => void
  readonly state: PartnershipState
  readonly pending: boolean
  readonly action: (form: FormData) => void
  readonly locale: 'en' | 'id'
  /** Turnstile's public site key, or `null` while the host has none — the form is then off. */
  readonly siteKey: string | null
  /** The shop's privacy notice, linked from the promise under the button. */
  readonly privacyHref: string
  /** Changes after each submit so the widget fetches a fresh token. */
  readonly resetToken?: unknown
}

export function PartnershipFormView({
  text,
  segments,
  segment: chosen,
  onSegment,
  state,
  pending,
  action,
  locale,
  siteKey,
  privacyHref,
  resetToken,
}: Props) {
  if (state.status === 'success') {
    return (
      <div className={styles.form}>
        <FormMessage tone="success">
          <strong>{text['partnership.formSuccessTitle']}</strong>
          <p className={styles.messageBody}>{text['partnership.formSuccessBody']}</p>
        </FormMessage>
      </div>
    )
  }

  const words: Readonly<Record<string, string>> = text
  const say = (key: string | undefined): string | undefined =>
    key === undefined ? undefined : (words[key] ?? text['lead.error.invalid'])
  const { errors, values } = state
  const segment: Segment = chosen ?? (isSegment(values.segment) ? values.segment : 'reseller')
  const asked = segments.segments[segment]

  return (
    <form className={styles.form} action={action} noValidate>
      <input type="hidden" name="locale" value={locale} />
      <fieldset className={styles.segments}>
        <legend className={styles.question}>{segments.question}</legend>
        <div className={styles.chips}>
          {SEGMENTS.map((each) => (
            <label key={each} className={styles.chip}>
              <input
                type="radio"
                name="segment"
                value={each}
                checked={each === segment}
                onChange={() => onSegment?.(each)}
                className={styles.chipInput}
              />
              <span>{segments.segments[each].label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Input
        label={text['partnership.formName']}
        id="p-name"
        name="name"
        autoComplete="name"
        defaultValue={values.name}
        error={say(errors.name)}
        required
      />
      {errors.contact !== undefined && (
        <FormMessage tone="error">{say(errors.contact)}</FormMessage>
      )}
      <Input
        label={text['partnership.formEmail']}
        id="p-email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={values.email}
        error={say(errors.email)}
        required
      />
      <Input
        label={asked.org}
        id="p-org"
        name="org"
        autoComplete="organization"
        defaultValue={values.org}
      />
      <Input label={asked.scale} id="p-scale" name="scale" defaultValue={values.scale} />
      <Input label={asked.context} id="p-context" name="context" defaultValue={values.context} />
      <Input
        label={segments.more}
        id="p-message"
        name="message"
        defaultValue={values.message}
        error={say(errors.message)}
      />
      {/* Without a site key (a workstation) there is no widget: the server then refuses the post
          with the security-check error, shown above the button. */}
      {siteKey !== null && <TurnstileWidget siteKey={siteKey} resetToken={resetToken} />}
      {errors.form !== undefined && <FormMessage tone="error">{say(errors.form)}</FormMessage>}
      <div className={styles.actions}>
        <Button variant="primary" size="small" type="submit" disabled={pending}>
          {pending ? text['partnership.formSending'] : asked.submit}
        </Button>
        <p className={styles.formNote}>{asked.reply}</p>
      </div>
      {/* No consent box (the handoff's form): sending under this line and its privacy notice is the
          consent, recorded with the lead as CONSENT_VERSION (COMPLIANCE.md §6). */}
      <p className={styles.promise}>
        {segments.promise}{' '}
        <a href={privacyHref} className={styles.privacy}>
          {segments.privacy}
        </a>
      </p>
    </form>
  )
}
