/** The tools' definitions, argument checks, handoff links and the consent gate (AI.md §2.4, §4). */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { ConsentStore } from '../consent'
import { chatCopy } from '../lexicon'
import { stubSiteEnv } from '../test-support/harness'
import { MemoryReader, settingsFor } from '../test-support/memory'
import { buildHandoffs, cleanSummary, waDigits } from './handoff'
import { runTool, type ToolContext } from './run'
import { toolsFor } from './schemas'
import { validateToolCall } from './validate'

beforeEach(stubSiteEnv)
afterEach(() => vi.unstubAllEnvs())

function context(site: 'gallery' | 'shop' = 'gallery'): ToolContext {
  return {
    site,
    locale: 'en',
    t: chatCopy('en', site),
    reader: new MemoryReader(),
    settings: settingsFor(site),
    sessionId: '100',
    consents: new ConsentStore(),
    notePrice: () => {},
    itemIds: new Set(),
  }
}

describe('the tool definitions', () => {
  it('are strict, closed objects; the gallery has no store tool', () => {
    for (const site of ['gallery', 'shop'] as const) {
      for (const tool of toolsFor(site)) {
        expect(tool.strict, tool.name).toBe(true)
        expect(tool.input_schema.additionalProperties, tool.name).toBe(false)
      }
    }
    expect(toolsFor('gallery').map((t) => t.name)).toEqual([
      'search_catalogue',
      'get_item',
      'delivery_info',
      'handoff_link',
      'create_lead',
    ])
    expect(toolsFor('shop').map((t) => t.name)).toContain('store_info')
    // Deterministic bytes per site: the prompt cache depends on it.
    expect(JSON.stringify(toolsFor('shop'))).toBe(JSON.stringify(toolsFor('shop')))
  })
})

describe('argument checks', () => {
  it.each([
    ['search_catalogue', { query: 'x'.repeat(81) }],
    ['search_catalogue', { query: 'bali', limit: 50 }],
    ['search_catalogue', { query: '', filters: {} }],
    ['search_catalogue', { query: 'bali', filters: { category: 'bags' } }],
    ['search_catalogue', { query: 'bali', filters: { objectType: 'spaceship' } }],
    ['get_item', { id: '../etc/passwd' }],
    ['get_item', { id: '1726', askingPrice: true }],
    ['handoff_link', { channel: 'sms', topic: 'price', itemIds: [] }],
    [
      'handoff_link',
      { channel: 'whatsapp', topic: 'price', itemIds: ['1', '2', '3', '4', '5', '6', '7'] },
    ],
    ['create_lead', { kind: 'ask', summary: 'x'.repeat(501), itemIds: [] }],
    ['store_info', {}],
    ['update_price', {}],
  ])('refuse %s %j on the gallery', (name, input) => {
    expect(validateToolCall(name, input, 'gallery').ok).toBe(false)
  })

  it('accept a well-formed call and apply the defaults', () => {
    expect(validateToolCall('search_catalogue', { query: ' Bali ' }, 'gallery')).toEqual({
      ok: true,
      call: { name: 'search_catalogue', query: 'Bali', limit: 4, filters: {} },
    })
    expect(validateToolCall('store_info', { area: 'Ubud' }, 'shop')).toEqual({
      ok: true,
      call: { name: 'store_info', area: 'Ubud' },
    })
  })
})

describe('the handoff link', () => {
  const t = chatCopy('id', 'gallery')
  const settings = settingsFor('gallery')

  it('is built from site-settings and the item, in the visitor’s language', () => {
    const [wa, mail] = buildHandoffs({
      site: 'gallery',
      settings,
      t,
      topic: 'item_enquiry',
      items: [
        {
          title: 'Bali, 1726',
          ref: 'M.1044',
          url: 'https://indies-gallery.gaiada.com/id/produk/1726-bali',
        },
      ],
      summary: 'Apakah sudah berbingkai?',
    })
    expect(wa?.href.startsWith('https://wa.me/6591234567?text=')).toBe(true)
    const text = new URL(wa!.href).searchParams.get('text')
    expect(text).toBe(
      'Halo Indies Gallery, saya ingin bertanya tentang sebuah barang.\n\nBarang:\n- Bali, 1726 (M.1044)\n  https://indies-gallery.gaiada.com/id/produk/1726-bali\n\nPertanyaan saya: Apakah sudah berbingkai?',
    )
    expect(wa?.label).toBe('Lanjutkan di WhatsApp')
    expect(mail?.href).toMatch(/^mailto:gallery@example\.com\?subject=Pertanyaan%20dari%20situs/)
  })

  it('carries no link, contact detail or amount the model put in the summary', () => {
    expect(
      cleanSummary(
        'see https://evil.example/x, www.x.com or bit.ly/abc; mail a@b.co; price USD 500',
        'gallery',
      ),
    ).toBe('see , or ; mail [email shared]; price [amount removed]')
  })

  it('is left out when settings name no contact', () => {
    expect(
      buildHandoffs({
        site: 'gallery',
        settings: { ...settings, contact: { whatsapp: 'not a number', email: null } },
        t,
        topic: 'general',
        items: [],
        summary: null,
      }),
    ).toEqual([])
    expect(waDigits('+62 812-3456-7890')).toBe('6281234567890')
    expect(waDigits('0812345')).toBeNull()
  })
})

describe('running the tools', () => {
  it('create_lead shows the consent form and creates nothing', async () => {
    const ctx = context()
    const call = validateToolCall(
      'create_lead',
      { kind: 'sell', summary: 'Has a map to sell, call +62 812 3456 7890', itemIds: [] },
      'gallery',
    )
    if (!call.ok) throw new Error(call.reason)
    const outcome = await runTool(call.call, ctx)
    expect(outcome.content).toContain('needs_consent')
    const form = outcome.events.find((e) => e.type === 'lead_form')
    expect(form).toMatchObject({ kind: 'sell', consentVersion: 'chat-consent-2026-10' })
    const token = form?.type === 'lead_form' ? form.consentToken : ''
    expect(ctx.consents.claim(token, '100')?.summary).toBe('Has a map to sell, call [phone shared]')
    expect(ctx.consents.claim(token, '100')).toBeNull()
  })

  it('a failing read answers "unavailable" and leaks nothing', async () => {
    const ctx = {
      ...context(),
      reader: {
        find: async () => {
          throw new Error('db down: password=x')
        },
        productsInStock: async () => new Set<string>(),
      },
    }
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const outcome = await runTool({ name: 'get_item', id: '1726' }, ctx)
    expect(outcome.isError).toBe(true)
    expect(outcome.content).toBe('<catalogue_data>\n{"error":"unavailable"}\n</catalogue_data>')
    expect(JSON.stringify(error.mock.calls)).not.toContain('password')
    error.mockRestore()
  })

  it('status lines never name a tool', async () => {
    const outcome = await runTool({ name: 'delivery_info' }, context('shop'))
    expect(outcome.events[0]).toEqual({ type: 'status', label: 'Checking delivery' })
  })
})
