/**
 * The partnership form's view (TASKS.md 9.1.c): per-field errors from lexicon keys, the typed
 * values kept, a success state, a disabled button while pending and while there is no Turnstile
 * key. The repo renders to static markup (no jsdom), so the view takes its state as props.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FORM_TEXT_KEYS, formText } from './form-text'
import { PartnershipFormView } from './form-view'
import {
  CONSENT_VERSION,
  EMPTY_VALUES,
  INITIAL_PARTNERSHIP_STATE,
  type PartnershipState,
} from './state'

// Each word is its own key, so an assertion names exactly which message was shown.
const text = formText((key, params) => (params ? `${key}:${params.version}` : key))

const render = (
  state: PartnershipState,
  over: { pending?: boolean; siteKey?: string | null } = {},
) =>
  renderToStaticMarkup(
    <PartnershipFormView
      text={text}
      state={state}
      pending={over.pending ?? false}
      action={() => undefined}
      locale="en"
      siteKey={over.siteKey === undefined ? '1x00000000000000000000AA' : over.siteKey}
    />,
  )

describe('the partnership form', () => {
  it('shows field errors and a success state', () => {
    const errors = render({
      status: 'error',
      values: { ...EMPTY_VALUES, name: 'Made', message: 'Three villas' },
      errors: {
        name: 'lead.error.name',
        contact: 'lead.error.contact',
        whatsapp: 'lead.error.whatsapp',
        email: 'lead.error.email',
        consent: 'lead.error.consent',
        form: 'lead.error.challenge',
      },
    })
    for (const key of [
      'lead.error.name',
      'lead.error.contact',
      'lead.error.whatsapp',
      'lead.error.email',
      'lead.error.consent',
      'lead.error.challenge',
    ]) {
      expect(errors).toContain(`>${key}<`)
    }
    // A field's error sits under that field and marks it invalid.
    expect(errors).toMatch(/id="p-name"[^>]*aria-invalid="true"/)
    // The visitor's words are put back, not lost.
    expect(errors).toContain('value="Made"')
    expect(errors).toContain('Three villas')

    const done = render({ status: 'success', errors: {}, values: EMPTY_VALUES })
    expect(done).toContain('partnership.formSuccessTitle')
    expect(done).toContain('partnership.formSuccessBody')
    expect(done).toContain('role="status"')
    expect(done).not.toContain('<form')
  })

  it('shows no error before anything is sent, and the consent line with its version', () => {
    const html = render(INITIAL_PARTNERSHIP_STATE)
    expect(html).not.toContain('role="alert"')
    expect(html).toContain(`partnership.formConsentVersion:${CONSENT_VERSION}`)
    expect(html).toContain('name="consent"')
    expect(html).toContain('name="locale" value="en"')
  })

  it('disables the button while pending, and says why when there is no Turnstile key', () => {
    const pending = render(INITIAL_PARTNERSHIP_STATE, { pending: true })
    expect(pending).toMatch(/<button[^>]*disabled=""[^>]*>partnership.formSending</)
    const idle = render(INITIAL_PARTNERSHIP_STATE)
    expect(idle).not.toMatch(/<button[^>]*disabled/)
    const keyless = render(INITIAL_PARTNERSHIP_STATE, { siteKey: null })
    expect(keyless).toContain('partnership.formUnavailable')
    expect(keyless).toMatch(/<button[^>]*disabled=""/)
  })

  it('has every word the island needs in the shop lexicon, in both languages', async () => {
    const en = (await import('../lexicon/en.json')).default as Record<string, string>
    const id = (await import('../lexicon/id.json')).default as Record<string, string>
    for (const key of FORM_TEXT_KEYS) {
      expect(en[key], key).toBeTruthy()
      expect(id[key], key).toBeTruthy()
    }
  })
})
