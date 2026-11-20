'use server'

/**
 * The newsletter pop-up's Server Action (TASKS.md 28.2): reached by anyone who can POST, so it
 * trusts nothing but what `handleNewsletterForm` validates — Turnstile, the per-address limit and
 * the lead service's validator all run server-side.
 */
import { headers } from 'next/headers'

import { clientAddress } from '@engine/chat/server/identity'
import { leadDeps } from '@engine/site/leads/deps'

import type { NewsletterState } from './state'
import { handleNewsletterForm } from './submit'

export async function submitNewsletter(
  _previous: NewsletterState,
  form: FormData,
): Promise<NewsletterState> {
  const email = typeof form.get('email') === 'string' ? String(form.get('email')) : ''
  try {
    const [deps, requestHeaders] = await Promise.all([leadDeps(), headers()])
    return await handleNewsletterForm(deps, form, clientAddress(requestHeaders))
  } catch {
    return { status: 'error', errors: { form: 'lead.error.unavailable' }, email }
  }
}
