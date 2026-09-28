/**
 * @contract C2 — view models: the account's signed-out pages · owner: ARC · consumers: WEB, UXG, UXE
 *
 * Sign-in, setting a password from an emailed link, and asking for one (C10 `account`, and its
 * `setPassword` and `reset` sections; C13 `AUTH_OPERATIONS`). What holds everywhere: one answer
 * for every email, so no page tells who has an account or who is a partner; a retailer who is
 * not approved cannot sign in (D34); and a post without JavaScript comes back through C13's
 * `FORM_RESULT`, its failure below the form with every entry kept.
 */
import type { AccountSection } from '@engine/config/routes'

import type { LinkVM } from '../common'
import type { FormPostVM, FormResultVM } from './form-fields'

/** Sign-in (`auth.signIn`): email and password, the hidden `returnTo`, and the way to a reset. */
export type SignInFormVM = FormPostVM & {
  /** The account's reset page (C10 `ACCOUNT_SECTIONS` `reset`). */
  reset: LinkVM
}

/**
 * What a failed sign-in says: one `invalid` for an unknown email, a wrong password and a
 * partner who is not approved, so sign-in never tells who has an account or is a partner.
 */
export type SignInErrorVM =
  | { kind: 'invalid' }
  | { kind: 'locked'; retryAfterMinutes: number }
  | { kind: 'rateLimited'; retryAfterSeconds: number }

export type SignedOutVM = {
  kind: 'signedOut'
  /** Where sign-in returns to. */
  returnTo: AccountSection
  signIn: SignInFormVM
  /** A sign-in that came back, its email kept. */
  failed: { email: string | null; error: SignInErrorVM } | null
  /**
   * How an account is opened here: a buyer signs up (`accounts.buyers`); a partner only
   * applies, on the Partnership page (`accounts.retailers`). Where only the second is on, no
   * shopper sign-up is offered and sign-in is the partners' (D31).
   */
  signUp: readonly ({ audience: 'buyer' } | { audience: 'retailer'; apply: LinkVM })[]
  /** A migrated buyer asks for a claim link on the reset page (MIGRATION.md §5). */
  claim: boolean
}

/**
 * The page an emailed password link lands on (C13 `PASSWORD_LINK`): approval's (D31), a
 * reset's, or a migrated buyer's claim. The token is in the link's cookie by now, never in
 * this page's URL. A good link shows the form (the new password, `new-password`), and setting
 * it signs the customer in; an expired or used one says so and leads to a new one.
 */
export type SetPasswordVM = {
  kind: 'setPassword'
  reason: 'approval' | 'reset' | 'claim'
  link:
    | {
        state: 'ready'
        /** Whose password this is: the email the link was sent to. */
        email: string
        form: FormPostVM
        failed: Exclude<FormResultVM, { kind: 'received' }> | null
      }
    /** The reset page, to ask for another link. */
    | { state: 'expired'; requestAnother: LinkVM }
}

/**
 * Asking for a password link (`auth.resetRequest`): one email field, and one answer for every
 * email — `received`, whether or not a link went out (C13 sends one only to an account that
 * may sign in). It is also how a partner who lost approval's email gets it again.
 */
export type ResetRequestVM = {
  kind: 'reset'
  form: FormPostVM
  result: FormResultVM | null
}
