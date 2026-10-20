/**
 * The partnership page's last section (the handoff's "Already a partner"): the words at the left
 * and, at the right, the sign-in box — or, for a partner already signed in, their account: a
 * welcome by name, the address they signed in with and Sign out. It reads the request's cookie, so
 * the page renders it inside `<Suspense>`; while it streams, the sign-in box holds the place.
 */
import { Suspense } from 'react'

import { currentPartner } from '../../../server/shop/partners/current'
import { partnerSignOutAction } from '../../../server/shop/partners/actions'
import { Button } from '../../../shared/ui'
import { Caps } from '../ui/caps-link'
import { SignInForm, type SignInText } from './sign-in-form'
import styles from './sign-in.module.css'

export type PartnerPanelText = {
  readonly eyebrow: string
  readonly title: string
  readonly body: string
  readonly welcome: (name: string) => string
  readonly accountBody: string
  readonly accountEmail: string
  readonly signOut: string
  readonly form: SignInText
}

export function PartnerPanel({ text }: { readonly text: PartnerPanelText }) {
  return (
    <section id="signin" className={styles.section} aria-labelledby="partner-signin">
      <Suspense fallback={<SignedOut text={text} />}>
        <Panel text={text} />
      </Suspense>
    </section>
  )
}

async function Panel({ text }: { readonly text: PartnerPanelText }) {
  const partner = await currentPartner().catch(() => null)
  if (partner === null) return <SignedOut text={text} />
  return (
    <>
      <div className={styles.words}>
        <Caps className={styles.eyebrow}>{text.eyebrow}</Caps>
        <h2 id="partner-signin" className={styles.title}>
          {text.welcome(partner.name)}
        </h2>
        <p className={styles.body}>{text.accountBody}</p>
      </div>
      <div className={styles.box}>
        <dl className={styles.facts}>
          <dt>{text.accountEmail}</dt>
          <dd>{partner.email}</dd>
        </dl>
        <form action={partnerSignOutAction} className={styles.actions}>
          <Button type="submit" variant="secondary" size="small">
            {text.signOut}
          </Button>
        </form>
      </div>
    </>
  )
}

function SignedOut({ text }: { readonly text: PartnerPanelText }) {
  return (
    <>
      <div className={styles.words}>
        <Caps className={styles.eyebrow}>{text.eyebrow}</Caps>
        <h2 id="partner-signin" className={styles.title}>
          {text.title}
        </h2>
        <p className={styles.body}>{text.body}</p>
      </div>
      <div className={styles.box}>
        <SignInForm text={text.form} />
      </div>
    </>
  )
}
