/**
 * Script in a lead (TASKS.md 10.1.e, class 3; SECURITY.md B1, V1–V2, §2.8): a visitor puts markup
 * in a lead form's name or message, and the owner — or anyone — puts it in a note. The text is
 * stored as text, and every place the owner's admin shows it renders it escaped: the leads inbox
 * rows, the "open the source" block. No `dangerouslySetInnerHTML` stands between the stored
 * string and the page.
 *
 * Rendered with `react-dom/server` from the real components (`admin/leads/*.jsx`) given hostile
 * lead rows, no database needed — the safety is in the render, not in the query.
 *
 * Planted violation (tests/security/plants/run-plants.mjs, class "xss"): the inbox row's message
 * rendered with `dangerouslySetInnerHTML` in `engine/packages/cms/src/admin/leads/inbox.jsx`.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { LeadSourceBlock } from '../../engine/packages/cms/src/admin/leads/source-block'
import { LeadsInboxView } from '../../engine/packages/cms/src/admin/leads/inbox'
import { jsonLdScript } from '../../engine/apps/web/src/server/seo/json-ld'
import { LEAD_LIMITS, parseLeadInput } from '../../engine/apps/web/src/server/leads/input'

/** Markup that runs script if it ever reaches a page as HTML. */
const HOSTILE = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '"><svg onload=alert(1)>',
  '</div><iframe src="//evil.example"></iframe>',
  "'><details open ontoggle=alert(1)>",
  '<a href="javascript:alert(1)">click</a>',
]
/** An element or an event handler the text must never become. */
const LIVE = /<(script|img|svg|iframe|details|a\s+href="javascript)/i

const owner = { id: 1, collection: 'users', role: 'owner' }

/** A stand-in Payload whose `find` answers `docs` for any collection. */
const payloadWith = (docs: unknown[]) => ({
  find: async () => ({ docs, totalDocs: docs.length, totalPages: 1, page: 1 }),
})

const inbox = async (docs: unknown[]) =>
  renderToStaticMarkup(
    (await LeadsInboxView({
      payload: payloadWith(docs),
      i18n: { language: 'en' },
      searchParams: {},
      initPageResult: { req: { user: owner } },
    } as never)) as never,
  )

describe('a lead’s text is shown escaped in the owner’s admin', () => {
  it.each(HOSTILE)('the inbox row shows %s as text', async (hostile) => {
    const html = await inbox([
      {
        id: 7,
        kind: 'ask',
        site: 'gallery',
        status: 'new',
        createdAt: new Date().toISOString(),
        payload: { name: hostile, preferredChannel: hostile, message: hostile },
      },
    ])
    expect(html).not.toMatch(LIVE)
    // No real tag carries an event handler: in escaped text the `<` is an entity, so a tag with
    // `on…=` could only be one the component itself made.
    expect(html).not.toMatch(/<[a-z][^>]*\son[a-z]+=/i)
    // It is there, as characters: the angle brackets and quotes are entities.
    expect(html).toContain(
      hostile
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;'),
    )
  })

  it('the source block shows a work’s title and stock number as text', async () => {
    const hostile = HOSTILE[0]!
    const html = renderToStaticMarkup(
      (await LeadSourceBlock({
        data: { items: [3] },
        payload: payloadWith([{ id: 3, title: hostile, stockNumber: HOSTILE[1] }]),
        req: { user: owner },
        i18n: { language: 'en' },
      } as never)) as never,
    )
    expect(html).not.toMatch(LIVE)
    expect(html).toContain('&lt;script&gt;')
  })

  it('the inbox links go to admin paths built from the row id alone', async () => {
    const html = await inbox([
      {
        id: 12,
        kind: 'ask',
        site: 'shop',
        status: 'new',
        createdAt: new Date().toISOString(),
        payload: { name: '"><a href="//evil.example">x</a>', message: 'hi' },
      },
    ])
    const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1]!)
    expect(hrefs.every((href) => href.startsWith('/admin/'))).toBe(true)
  })
})

describe('a lead is stored as text, bounded and without extra keys (V1, V2, V4)', () => {
  const context = {
    kind: 'ask',
    site: 'gallery',
    source: 'form',
    consentVersion: '2026-10',
  } as const
  const base = {
    name: 'A. Visitor',
    email: 'a@example.test',
    message: 'Hello',
    locale: 'en',
    consent: true,
  }

  it('keeps hostile markup verbatim as a string (it is escaped on output, not rewritten on input)', () => {
    const parsed = parseLeadInput({ ...base, name: HOSTILE[0], message: HOSTILE[1] }, context)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.value.name).toBe(HOSTILE[0])
      expect(parsed.value.message).toBe(HOSTILE[1])
    }
  })

  it('refuses an over-long message and an unknown key', () => {
    expect(
      parseLeadInput({ ...base, message: 'x'.repeat(LEAD_LIMITS.message + 1) }, context).ok,
    ).toBe(false)
    expect(parseLeadInput({ ...base, role: 'owner' }, context).ok).toBe(false)
    expect(parseLeadInput({ ...base, site: 'shop' }, context).ok).toBe(false)
  })
})

describe('the one dangerouslySetInnerHTML in the app cannot be broken out of (B1)', () => {
  it('escapes every angle bracket of a hostile product name inside the JSON-LD script', () => {
    const script = jsonLdScript({
      '@type': 'Product',
      name: '</script><script>alert(1)</script>',
      description: '<!-- <script>',
    })
    const inner = script.slice(script.indexOf('>') + 1, script.lastIndexOf('</script'))
    expect(inner).not.toContain('<')
    expect(inner).not.toContain('>')
    expect(JSON.parse(inner)).toMatchObject({ name: '</script><script>alert(1)</script>' })
  })
})
