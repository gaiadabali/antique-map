/**
 * TASKS.md 8.1.b–c through the routes: contact details are masked before the model; `create_lead`
 * only shows the consent form; the lead exists only after the visitor's consent click, the model
 * never sees the details and learns only the reference; the handoff link carries the item; the
 * shop's amounts are only the labels its tools returned.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { postConsent } from './http/consent'
import { postMessage } from './http/message'
import { startSession } from './http/session'
import { everythingSent, type Script } from './test-support/fake-model'
import {
  chatRequest,
  cookieOf,
  eventsOf,
  harness,
  HOSTS,
  stubSiteEnv,
  textOf,
  type Harness,
} from './test-support/harness'
import type { ChatEvent, SiteKey } from './types'

beforeEach(stubSiteEnv)
afterEach(() => vi.unstubAllEnvs())

async function open(h: Harness, site: SiteKey = 'gallery'): Promise<string> {
  h.turnstile.hostname = HOSTS[site]
  const response = await startSession(
    chatRequest(site, '/api/x/chat/session', { body: { turnstileToken: 'tok', locale: 'en' } }),
    h.deps,
  )
  return cookieOf(response)
}

async function send(
  h: Harness,
  cookie: string,
  text: string,
  site: SiteKey = 'gallery',
  pagePath = '/',
) {
  h.tick()
  const response = await postMessage(
    chatRequest(site, '/api/x/chat/message', { cookie, body: { text, locale: 'en', pagePath } }),
    h.deps,
  )
  return eventsOf(response)
}

function consent(h: Harness, cookie: string, body: Record<string, unknown>) {
  return postConsent(chatRequest('gallery', '/api/x/chat/consent', { cookie, body }), h.deps)
}

const leadForm = (events: ChatEvent[]) =>
  events.find((e): e is Extract<ChatEvent, { type: 'lead_form' }> => e.type === 'lead_form')

describe('contact details and the consent gate', () => {
  const script: Script = (params, call) => {
    const sent = JSON.stringify(params.messages)
    if (call === 0 && sent.includes('[phone shared]')) {
      return {
        tools: [
          {
            name: 'create_lead',
            input: { kind: 'ask', summary: 'Wants the Bali map', itemIds: ['1726'] },
          },
        ],
      }
    }
    return { text: 'Thank you. Please fill in the form and the gallery will reply.' }
  }

  it('masks them before the model and the transcript, and creates a lead only after the click', async () => {
    const h = harness(script)
    const cookie = await open(h)
    const events = await send(
      h,
      cookie,
      'Call me on +62 812-3456-7890 or mail me at buyer@example.org about the Bali map',
    )

    const sent = everythingSent(h.model)
    expect(sent).toContain('[phone shared]')
    expect(sent).toContain('[email shared]')
    expect(sent).not.toMatch(/3456|7890|buyer@example\.org/)
    const session = [...h.store.sessions.values()][0]!
    expect(JSON.stringify(session.transcript)).not.toMatch(/3456|buyer@example/)

    // `create_lead` from the model created nothing: it showed the form.
    expect(h.store.leads).toHaveLength(0)
    const form = leadForm(events)
    expect(form).toMatchObject({ kind: 'ask', itemIds: ['1726'] })
    expect(form?.consentText).toContain('Share these details with Indies Gallery')
    const token = form!.consentToken

    // Without the consent click, still nothing.
    const unticked = await consent(h, cookie, {
      consentToken: token,
      consent: false,
      name: 'Ann',
      email: 'ann@example.org',
      preferredChannel: 'email',
      idempotencyKey: 'key-00000001',
    })
    expect(unticked.status).toBe(400)
    expect(h.store.leads).toHaveLength(0)

    const body = {
      consentToken: token,
      consent: true,
      name: 'Ann Buyer',
      whatsapp: '+62 812 3456 7890',
      email: 'Ann@Example.org',
      preferredChannel: 'whatsapp',
      message: 'Is it framed?',
      idempotencyKey: 'key-00000001',
    }
    const created = await consent(h, cookie, body)
    expect(created.status).toBe(200)
    expect(await created.json()).toEqual({ ok: true, reference: 'L-1' })
    expect(h.store.leads).toHaveLength(1)
    expect(h.store.leads[0]).toMatchObject({
      site: 'gallery',
      kind: 'ask',
      name: 'Ann Buyer',
      whatsapp: '+6281234567890',
      email: 'ann@example.org',
      preferredChannel: 'whatsapp',
      workIds: ['1'],
      consentVersion: 'chat-consent-2026-10',
    })
    // A double tap makes one lead; the token cannot make a second.
    expect(await (await consent(h, cookie, body)).json()).toEqual({ ok: true, reference: 'L-1' })
    expect((await consent(h, cookie, { ...body, idempotencyKey: 'key-00000002' })).status).toBe(410)
    expect(h.store.leads).toHaveLength(1)

    // The model learns the reference on its next turn — never the details.
    await send(h, cookie, 'Thanks!')
    const next = JSON.stringify(h.model.answerCalls.at(-1)!.messages)
    expect(next).toContain('reference L-1')
    expect(everythingSent(h.model)).not.toMatch(/Ann Buyer|ann@example|3456|7890/)
    expect([...h.store.sessions.values()][0]!.outcome).toBe('lead')
  })

  it('refuses a consent token from another session', async () => {
    const h = harness(script)
    const cookie = await open(h)
    const token = leadForm(await send(h, cookie, 'Ring me on +65 9123 4567 please'))!.consentToken
    h.tick(60 * 60 * 1000)
    const other = await open(h)
    const response = await consent(h, other, {
      consentToken: token,
      consent: true,
      name: 'Eve',
      email: 'eve@example.org',
      preferredChannel: 'email',
      idempotencyKey: 'key-00000003',
    })
    expect(response.status).toBe(410)
    expect(h.store.leads).toHaveLength(0)
  })
})

describe('the handoff link', () => {
  it('opens WhatsApp or email to the site’s own contact, with the item attached', async () => {
    const script: Script = (_p, call) =>
      call === 0
        ? {
            tools: [
              {
                name: 'handoff_link',
                input: {
                  channel: 'whatsapp',
                  topic: 'price',
                  itemIds: ['1726'],
                  summary: 'Price? see https://evil.example/x',
                },
              },
            ],
          }
        : { text: 'The team will answer on WhatsApp.' }
    const h = harness(script, () => 'price_request')
    const cookie = await open(h)
    const events = await send(
      h,
      cookie,
      'How much is the Bali map?',
      'gallery',
      '/product/1726-bali-by-francois-valentijn-1726',
    )

    const handoffs = events.filter(
      (e): e is Extract<ChatEvent, { type: 'handoff' }> => e.type === 'handoff',
    )
    // The tool's buttons only: the classifier's required handoff is not doubled.
    expect(handoffs.map((e) => e.channel)).toEqual(['whatsapp', 'email'])
    const wa = new URL(handoffs[0]!.href)
    expect(wa.origin + wa.pathname).toBe('https://wa.me/6591234567')
    const text = wa.searchParams.get('text') ?? ''
    expect(text).toContain('Bali by François Valentijn, 1726 (M.1044)')
    expect(text).toContain(
      'https://indies-gallery.gaiada.com/product/1726-bali-by-francois-valentijn-1726',
    )
    expect(text).not.toContain('evil.example')
    const mail = handoffs[1]!.href
    expect(mail.startsWith('mailto:gallery@example.com?subject=')).toBe(true)
    expect(decodeURIComponent(mail)).toContain('Website enquiry: the price of an item')
    // The model was told which item the page is, and got no URL back to repeat.
    expect(JSON.stringify(h.model.answerCalls[0]!.messages)).toContain('item id \\"1726\\"')
    expect(JSON.stringify(h.model.answerCalls[1]!.messages)).not.toContain('wa.me')
    expect(events.at(-1)).toEqual({ type: 'done', outcome: 'handoff' })
  })

  it('is added by the server for a handoff label, whatever the model says', async () => {
    const h = harness(
      () => ({ text: 'That is a good question.' }),
      () => 'authenticity_valuation',
    )
    const cookie = await open(h)
    const events = await send(h, cookie, 'Is this map genuine and what is it worth?')
    expect(events.filter((e) => e.type === 'handoff')).toHaveLength(2)
    expect(JSON.stringify(h.model.answerCalls[0]!.messages)).toContain('A handoff is required')
  })
})

describe('Turnstile', () => {
  it('fails a token solved on another site’s host', async () => {
    const h = harness(() => ({ text: 'ok' }))
    h.turnstile.hostname = HOSTS.gallery
    const response = await startSession(
      chatRequest('shop', '/api/x/chat/session', { body: { turnstileToken: 'tok', locale: 'en' } }),
      h.deps,
    )
    expect(response.status).toBe(403)
  })

  it('the published test secret starts a session although it answers for example.com', async () => {
    const h = harness(() => ({ text: 'ok' }))
    h.turnstile.hostname = 'example.com'
    h.turnstile.testKey = true
    const response = await startSession(
      chatRequest('shop', '/api/x/chat/session', { body: { turnstileToken: 'tok', locale: 'en' } }),
      h.deps,
    )
    expect(response.status).toBe(200)
  })

  it('a real secret answering for example.com is refused', async () => {
    const h = harness(() => ({ text: 'ok' }))
    h.turnstile.hostname = 'example.com'
    const response = await startSession(
      chatRequest('shop', '/api/x/chat/session', { body: { turnstileToken: 'tok', locale: 'en' } }),
      h.deps,
    )
    expect(response.status).toBe(403)
  })
})

describe('the shop', () => {
  it('states an amount only as the priceLabel a tool returned', async () => {
    const script: Script = (_p, call) =>
      call === 0
        ? { tools: [{ name: 'get_item', input: { id: 'batik-tote' } }] }
        : { text: 'The Batik tote is IDR 95,000 and in stock. Delivery is free over IDR 500,000.' }
    const h = harness(script)
    const cookie = await open(h, 'shop')
    const events = await send(h, cookie, 'How much is the batik tote?', 'shop')
    expect(textOf(events)).toContain('IDR 95,000')
    const card = events.find((e) => e.type === 'card')
    expect(card).toMatchObject({ kind: 'product', id: 'batik-tote', statusLabel: 'In stock' })
    // Formatted by `formatMoney` on the server (with a no-break space), never by the model.
    expect(card?.type === 'card' && card.priceLabel?.replace(/\s/g, ' ')).toBe('IDR 95,000')
    expect(events.at(-1)).toEqual({ type: 'done', outcome: 'answered' })
  })

  it('blocks an amount no tool returned', async () => {
    const h = harness(() => ({ text: 'For you, IDR 80,000 if you buy two. Shall I reserve them?' }))
    const cookie = await open(h, 'shop')
    const events = await send(h, cookie, 'Discount?', 'shop')
    expect(textOf(events)).not.toContain('80,000')
    expect(events.at(-1)).toEqual({ type: 'done', outcome: 'blocked' })
  })
})
