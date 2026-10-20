'use client'

/**
 * The partner sign-in form (the handoff's "Sign in to your prices" box): the email address and the
 * password, posted to the server action, which answers one of a few plain refusals. The words are
 * resolved on the server and passed in, so no lexicon reaches the browser.
 */
import { useActionState, useState } from 'react'

import { Button } from '../../../shared/ui'
import { partnerSignInAction } from '../../../server/shop/partners/actions'
import styles from './sign-in.module.css'

export type SignInText = {
  readonly email: string
  readonly password: string
  readonly submit: string
  readonly sending: string
  readonly forgot: string
  readonly reasons: Record<'invalid' | 'locked' | 'rate' | 'missing' | 'unavailable', string>
}

export function SignInForm({ text }: { readonly text: SignInText }) {
  const [state, action, pending] = useActionState(partnerSignInAction, null)
  // Controlled, so the address survives the form's reset after a refused try; the password does not.
  const [email, setEmail] = useState('')
  const problem = state?.status === 'error' && state.reason ? text.reasons[state.reason] : null
  return (
    <form className={styles.form} action={action}>
      <label className={styles.label} htmlFor="partner-email">
        {text.email}
      </label>
      <input
        id="partner-email"
        className={styles.input}
        type="email"
        name="email"
        autoComplete="username"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <label className={styles.label} htmlFor="partner-password">
        {text.password}
      </label>
      <input
        id="partner-password"
        className={styles.input}
        type="password"
        name="password"
        autoComplete="current-password"
        required
      />
      {problem !== null && (
        <p className={styles.problem} role="alert">
          {problem}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit" variant="primary" size="small" loading={pending}>
          {pending ? text.sending : text.submit}
        </Button>
      </div>
      <p className={styles.help}>{text.forgot}</p>
    </form>
  )
}
