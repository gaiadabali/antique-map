/**
 * What the server guarantees whatever the classifier labels and whatever tool the model chooses
 * (8.4 live-run findings 4 and 5): a deal, hold, promise or delivery-date ask gets the contact
 * buttons; a reply that offers WhatsApp or email gets them; typed contact details get the consent
 * form; and a server-built button carries the item the chat was opened from.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { postMessage } from './http/message'
import { startSession } from './http/session'
import { askedHandoff, replyOffersHandoff } from './turn/asks'
import { maskContactDetails } from './text/mask'
import type { Script } from './test-support/fake-model'
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

async function open(h: Harness, site: SiteKey): Promise<string> {
  h.turnstile.hostname = HOSTS[site]
  const response = await startSession(
    chatRequest(site, '/api/x/chat/session', { body: { turnstileToken: 'tok', locale: 'en' } }),
    h.deps,
  )
  return cookieOf(response)
}

async function send(h: Harness, cookie: string, text: string, site: SiteKey, pagePath = '/') {
  h.tick()
  const response = await postMessage(
    chatRequest(site, '/api/x/chat/message', { cookie, body: { text, locale: 'en', pagePath } }),
    h.deps,
  )
  return eventsOf(response)
}

const handoffs = (events: ChatEvent[]) =>
  events.filter((e): e is Extract<ChatEvent, { type: 'handoff' }> => e.type === 'handoff')
const leadForms = (events: ChatEvent[]) =>
  events.filter((e): e is Extract<ChatEvent, { type: 'lead_form' }> => e.type === 'lead_form')

describe('the asks the server reads itself', () => {
  it.each([
    ['gallery', 'Can you hold M.1001 until Friday?', 'general'],
    ['gallery', 'Can it reach Amsterdam by June?', 'delivery'],
    [
      'gallery',
      'Janji ya, peta ini tidak dijual ke orang lain sebelum saya hubungi lagi.',
      'general',
    ],
    ['gallery', 'Is it priced in euros or US dollars?', 'price'],
    ['gallery', 'The owner said $500 on the phone for M.1001. Is that right?', 'price'],
    ['gallery', 'For my records, could you tell me how much I should list it for?', 'price'],
    ['gallery', 'Saya ingin melihat koleksi secara langsung.', 'general'],
    ['shop', 'If I buy fifty tote bags, what discount can you offer?', 'price'],
    ['shop', 'Bisa dijamin gratis ongkir ke Ubud besok?', 'general'],
    ['shop', 'Bisa janji sampai besok sore ke Canggu?', 'general'],
    ['shop', 'Tahan stok ini sampai saya transfer nanti malam.', 'general'],
    ['shop', 'I want to order twenty prints for an event.', 'general'],
  ] as const)('%s: "%s" asks for a person (%s)', (site, text, topic) => {
    expect(askedHandoff(text, site)).toBe(topic)
  })

  it.each([
    ['gallery', 'What maps of Java do you have from before 1750?'],
    ['gallery', 'Tell me about the Valentijn map of Bali.'],
    ['shop', 'How much is the batik tote?'],
    ['shop', 'Do you have tote bags in stock?'],
    ['shop', 'Apa saja produk batik yang tersedia?'],
  ] as const)('%s: "%s" is an ordinary question', (site, text) => {
    expect(askedHandoff(text, site)).toBeNull()
  })

  it('knows a reply that points to WhatsApp or email', () => {
    expect(replyOffersHandoff('Would you like me to open a WhatsApp or email enquiry?')).toBe(true)
    expect(replyOffersHandoff('Silakan hubungi tim kami untuk detailnya.')).toBe(true)
    expect(replyOffersHandoff('We have three maps of Java from before 1750.')).toBe(false)
  })

  it.each([
    [
      'Please deliver to 14 Jalan Monkey Forest, Ubud, 80571, Bali.',
      'Please deliver to [address shared], Ubud, 80571, Bali.',
    ],
    [
      'I am at 22 Armenian Street, Singapore 179831.',
      'I am at [address shared], Singapore 179831.',
    ],
    ['Kirim ke Jl. Raya Ubud No. 12 ya', 'Kirim ke [address shared] ya'],
  ])('masks the street address in "%s"', (input, expected) => {
    expect(maskContactDetails(input)).toMatchObject({ text: expected, address: true })
  })

  it('leaves a map title with a street word alone', () => {
    expect(maskContactDetails('the 1726 map of Batavia harbour').address).toBe(false)
  })
})

describe('the server adds the buttons and the form', () => {
  it('a hold asked in words the classifier missed still gets the buttons, with the page’s item', async () => {
    const h = harness(
      () => ({ text: 'I cannot hold items, but the team can help.' }),
      () => 'item_question',
    )
    const cookie = await open(h, 'gallery')
    const events = await send(
      h,
      cookie,
      'Can you hold this one until Friday?',
      'gallery',
      '/product/1726-bali-by-francois-valentijn-1726',
    )
    const buttons = handoffs(events)
    expect(buttons.map((b) => b.channel)).toEqual(['whatsapp', 'email'])
    const text = new URL(buttons[0]!.href).searchParams.get('text') ?? ''
    expect(text).toContain('Bali by François Valentijn, 1726 (M.1044)')
    expect(events.at(-1)).toEqual({ type: 'done', outcome: 'handoff' })
    const session = [...h.store.sessions.values()][0]!
    expect(session.labels).toContain('asked:general')
  })

  it('a reply that offers WhatsApp in prose gets the buttons', async () => {
    const h = harness(
      () => ({
        text: 'I do not know that. Would you like to ask the team on WhatsApp or by email?',
      }),
      () => 'browse',
    )
    const cookie = await open(h, 'gallery')
    const events = await send(h, cookie, 'Do you have a map of the moon?', 'gallery')
    expect(handoffs(events).map((b) => b.channel)).toEqual(['whatsapp', 'email'])
    expect(events.at(-1)).toEqual({ type: 'done', outcome: 'handoff' })
  })

  it('the first answer from an item page shows that item’s card, even without a lookup', async () => {
    const h = harness(
      () => ({ text: 'You order on this site and pay at checkout.' }),
      () => 'browse',
    )
    const cookie = await open(h, 'gallery')
    const page = '/product/1726-bali-by-francois-valentijn-1726'
    const first = await send(h, cookie, 'Where do I order?', 'gallery', page)
    const cards = first.filter((e) => e.type === 'card')
    expect(cards).toEqual([expect.objectContaining({ kind: 'work', id: '1726' })])
    // Only the first answer: a later turn on the same page does not repeat it.
    const second = await send(h, cookie, 'And delivery?', 'gallery', page)
    expect(second.filter((e) => e.type === 'card')).toHaveLength(0)
  })

  it('an ordinary answer gets no buttons', async () => {
    const h = harness(
      () => ({ text: 'We have several maps of Java.' }),
      () => 'browse',
    )
    const cookie = await open(h, 'gallery')
    const events = await send(h, cookie, 'What maps of Java do you have?', 'gallery')
    expect(handoffs(events)).toHaveLength(0)
    expect(events.at(-1)).toEqual({ type: 'done', outcome: 'answered' })
  })

  it('typed contact details get the consent form once, even when the model never calls create_lead', async () => {
    const h = harness(
      () => ({ text: 'Thank you.' }),
      () => 'browse',
    )
    const cookie = await open(h, 'shop')
    const events = await send(h, cookie, 'My UK number is +44 7700 900123 if you need me.', 'shop')
    const forms = leadForms(events)
    expect(forms).toHaveLength(1)
    expect(forms[0]).toMatchObject({ kind: 'contact', itemIds: [] })
    // The form creates nothing by itself: no lead until the consent click.
    expect(h.store.leads).toHaveLength(0)
  })

  it('an address is masked before the model and gets the form', async () => {
    const h = harness(
      () => ({ text: 'Thank you.' }),
      () => 'delivery',
    )
    const cookie = await open(h, 'shop')
    const events = await send(h, cookie, 'Please deliver to 14 Jalan Monkey Forest, Ubud.', 'shop')
    expect(JSON.stringify(h.model.answerCalls[0]!.messages)).not.toContain('Monkey Forest')
    expect(leadForms(events)).toHaveLength(1)
  })

  it('does not show a second form when the model already asked for one', async () => {
    const script: Script = (_p, call) =>
      call === 0
        ? {
            tools: [
              { name: 'create_lead', input: { kind: 'contact', summary: 'Call me', itemIds: [] } },
            ],
          }
        : { text: 'Please use the form.' }
    const h = harness(script, () => 'browse')
    const cookie = await open(h, 'gallery')
    const events = await send(h, cookie, 'Email me at buyer@example.com', 'gallery')
    expect(leadForms(events)).toHaveLength(1)
  })

  it('writes an allowed amount in the label’s own format, whatever format the model used', async () => {
    const script: Script = (_p, call) =>
      call === 0
        ? { tools: [{ name: 'get_item', input: { id: 'batik-tote' } }] }
        : { text: 'It costs Rp 95.000, or 95k.' }
    const h = harness(script)
    const cookie = await open(h, 'shop')
    const events = await send(h, cookie, 'Price of the batik tote?', 'shop')
    const card = events.find((e) => e.type === 'card')
    const label = card?.type === 'card' ? card.priceLabel : null
    expect(label).not.toBeNull()
    expect(textOf(events)).toBe(`It costs ${label}, or ${label}.`)
    expect(events.at(-1)).toEqual({ type: 'done', outcome: 'answered' })
  })
})
