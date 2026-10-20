/**
 * The partnership form's view (TASKS.md 9.1.c): per-field errors from lexicon keys, the typed
 * values kept, a success state, a disabled button while pending; "What are you buying for?" as
 * a radio group that renames its fields; no notice when the host has no Turnstile key. The repo renders to static markup (no jsdom), so the view takes its state as props.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FORM_TEXT_KEYS, formText } from './form-text'
import { PartnershipFormView } from './form-view'
import { segmentText } from './segments'
import { EMPTY_VALUES, INITIAL_PARTNERSHIP_STATE, type PartnershipState } from './state'

// Each word is its own key, so an assertion names exactly which message was shown.
const text = formText((key, params) => (params ? `${key}:${params.version}` : key))

const render = (
  state: PartnershipState,
  over: {
    pending?: boolean
    siteKey?: string | null
    segment?: 'reseller' | 'company' | 'hotel'
  } = {},
) =>
  renderToStaticMarkup(
    <PartnershipFormView
      text={text}
      segments={segmentText('en')}
      segment={over.segment}
      state={state}
      pending={over.pending ?? false}
      action={() => undefined}
      locale="en"
      siteKey={over.siteKey === undefined ? '1x00000000000000000000AA' : over.siteKey}
      privacyHref="/page/privacy"
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
        form: 'lead.error.challenge',
      },
    })
    for (const key of [
      'lead.error.name',
      'lead.error.contact',
      'lead.error.whatsapp',
      'lead.error.email',
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

  it('shows no error before anything is sent, and no consent box — the promise and privacy link', () => {
    const html = render(INITIAL_PARTNERSHIP_STATE)
    expect(html).not.toContain('role="alert"')
    expect(html).not.toContain('name="consent"')
    expect(html).toContain('never anything more')
    expect(html).toContain('href="/page/privacy"')
    expect(html).toContain('>Privacy notice</a>')
    expect(html).toContain('name="locale" value="en"')
  })

  it('disables the button while pending, and shows no notice when there is no Turnstile key', () => {
    const pending = render(INITIAL_PARTNERSHIP_STATE, { pending: true })
    expect(pending).toMatch(/<button[^>]*disabled=""[^>]*>partnership.formSending</)
    const idle = render(INITIAL_PARTNERSHIP_STATE)
    expect(idle).not.toMatch(/<button[^>]*disabled/)
    const keyless = render(INITIAL_PARTNERSHIP_STATE, { siteKey: null })
    expect(keyless).not.toContain('partnership.formUnavailable')
    expect(keyless).not.toMatch(/<button[^>]*disabled/)
  })

  it('asks what they are buying for, as a radio group that renames the fields', () => {
    const shop = render(INITIAL_PARTNERSHIP_STATE)
    const radios = (html: string) => html.match(/<input[^>]*name="segment"[^>]*>/g) ?? []
    expect(radios(shop)).toHaveLength(3)
    expect(radios(shop).filter((tag) => tag.includes('checked'))).toEqual([
      expect.stringContaining('value="reseller"'),
    ])
    for (const words of [
      'A shop',
      'A company',
      'A hotel or villa',
      'Shop name',
      'Apply as a reseller',
    ]) {
      expect(shop).toContain(words)
    }
    const hotel = render(INITIAL_PARTNERSHIP_STATE, { segment: 'hotel' })
    expect(radios(hotel).filter((tag) => tag.includes('checked'))).toEqual([
      expect.stringContaining('value="hotel"'),
    ])
    expect(hotel).toContain('Hotel or villa name')
    expect(hotel).toContain('Request samples')
    expect(hotel).not.toContain('Shop name')
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
