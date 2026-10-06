/**
 * The handoff builder's tests (5.3.a): the EXPERIENCE-GALLERY.md §8 rows in English and in
 * Indonesian, from the gallery's own lexicon files (a fallback to the module's English default
 * would hide a missing translation), the 90-character title cut, the encoding of `&`, `#`, `?`
 * and newlines in both links, and the `null` fallback when the gallery's channels have not
 * arrived yet (OA2 pending).
 */
import { describe, expect, it } from 'vitest'

import type { SiteLocale } from '@engine/config/sites'
import { contactText } from './messages'
import {
  cutTitle,
  itemMessage,
  mailtoHref,
  noResultsMessage,
  sellMessage,
  soldMessage,
  talkLinks,
  viewingMessage,
  whatsappHref,
  type HandoffText,
} from './handoff'

/** The words as the pages get them: the gallery's own lexicon per locale. */
const textOf = (locale: SiteLocale): HandoffText => contactText(locale)

const ITEM = {
  stockNumber: 'M.0500',
  title: 'A chart of the Sunda Strait',
  url: 'https://indiesgallery.test/product/1706-a-chart',
}

describe('the §8 message rows, in the page’s language', () => {
  it('row 1 — item, available or on hold: stock number first, then the email body asks the question', () => {
    const en = itemMessage(textOf('en'), ITEM)
    expect(en.waText).toBe(
      `Hello, I am interested in M.0500 — A chart of the Sunda Strait. ${ITEM.url}`,
    )
    expect(en.subject).toBe('M.0500 — A chart of the Sunda Strait')
    expect(en.body).toBe(`${en.waText}\n\nMy question:`)
    const id = itemMessage(textOf('id'), ITEM)
    expect(id.waText).toBe(
      `Halo, saya tertarik dengan M.0500 — A chart of the Sunda Strait. ${ITEM.url}`,
    )
    expect(id.body).toBe(`${id.waText}\n\nPertanyaan saya:`)
  })

  it('row 2 — item, sold: asks for another example', () => {
    const en = soldMessage(textOf('en'), ITEM)
    expect(en.waText).toBe(
      `Hello, I see that M.0500 — A chart of the Sunda Strait has sold. Do you have another example? ${ITEM.url}`,
    )
    const id = soldMessage(textOf('id'), ITEM)
    expect(id.waText).toBe(
      `Halo, saya lihat M.0500 — A chart of the Sunda Strait sudah terjual. Apakah ada contoh lain? ${ITEM.url}`,
    )
    expect(en.subject).toBe(itemMessage(textOf('en'), ITEM).subject)
  })

  it('row 3 — viewing: the subject names the city, the message names the work', () => {
    const en = viewingMessage(textOf('en'), { ...ITEM, city: 'Singapore' })
    expect(en.waText).toBe(
      'Hello, I would like to arrange a viewing of M.0500 — A chart of the Sunda Strait.',
    )
    expect(en.subject).toBe('Viewing in Singapore')
    const id = viewingMessage(textOf('id'), { ...ITEM, city: 'Singapura' })
    expect(id.subject).toBe('Janji temu untuk melihat di Singapura')
  })

  it('row 4 — no results: the query is what the visitor was looking for', () => {
    const en = noResultsMessage(textOf('en'), 'Celebes charts')
    expect(en.waText).toBe('Hello, I am looking for Celebes charts. Do you have anything?')
    expect(en.subject).toBe('Looking for Celebes charts')
    const id = noResultsMessage(textOf('id'), 'peta Celebes')
    expect(id.waText).toBe('Halo, saya sedang mencari peta Celebes. Apakah ada?')
  })

  it('row 5 — sell to us: what they have, photos to follow on WhatsApp or email', () => {
    const en = sellMessage(textOf('en'), 'a map, print or photograph')
    expect(en.waText).toBe(
      'Hello, I have an antique I would like to sell: a map, print or photograph. I can send photos here.',
    )
    expect(en.subject).toBe('Selling an antique')
    const id = sellMessage(textOf('id'), 'peta, cetakan, atau foto')
    expect(id.waText).toBe(
      'Halo, saya punya benda antik yang ingin saya jual: peta, cetakan, atau foto. Saya bisa mengirim foto di sini.',
    )
  })
})

describe('the 90-character title cut', () => {
  const long = 'A'.repeat(120)

  it('cuts an over-long title with an ellipsis, and keeps a fitting one whole', () => {
    expect(cutTitle('Short title')).toBe('Short title')
    const cut = cutTitle(long)
    expect(cut.length).toBe(90)
    expect(cut.endsWith('…')).toBe(true)
  })

  it('counts characters, not UTF-16 units, so a cut never splits one', () => {
    const cut = cutTitle('𝔄'.repeat(95))
    expect(Array.from(cut)).toHaveLength(90)
    expect(cut).toBe(`${'𝔄'.repeat(89)}…`)
  })

  it('cuts to exactly 89 title characters plus the ellipsis', () => {
    expect(cutTitle('B'.repeat(91))).toBe(`${'B'.repeat(89)}…`)
  })

  it('the cut title, not the whole one, goes into the message', () => {
    const en = itemMessage(textOf('en'), { ...ITEM, title: long })
    expect(en.waText).toBe(`Hello, I am interested in M.0500 — ${cutTitle(long)}. ${ITEM.url}`)
  })
})

describe('the links’ encoding', () => {
  it('wa.me keeps the number’s digits alone and encodes the message once', () => {
    const href = whatsappHref('+62 812 3456 7890', 'Hello & welcome? #1\nLine two')
    expect(href.startsWith('https://wa.me/6281234567890?text=')).toBe(true)
    const text = decodeURIComponent(href.slice(href.indexOf('=') + 1))
    expect(text).toBe('Hello & welcome? #1\nLine two')
    expect(href).not.toContain(' ')
  })

  it('mailto: encodes the subject and the body, so a # or & in either survives', () => {
    const href = mailtoHref(
      'gallery@indies.test',
      'Q&A — a #2 title',
      'Is it available?& yes\nline two',
    )
    expect(href.startsWith('mailto:gallery@indies.test?subject=')).toBe(true)
    const subject = /subject=([^&]*)/.exec(href)?.[1] ?? ''
    const body = /body=(.*)$/.exec(href)?.[1] ?? ''
    expect(decodeURIComponent(subject)).toBe('Q&A — a #2 title')
    expect(decodeURIComponent(body)).toBe('Is it available?& yes\nline two')
    expect(href).not.toContain('?body=')
  })

  it('the built links decode back to the message and the subject', () => {
    const en = itemMessage(textOf('en'), { ...ITEM, title: 'Batavia & the coast? #3' })
    const links = talkLinks({ whatsapp: '+62 812 3456 7890', email: 'gallery@indies.test' }, en)
    const waText = decodeURIComponent((links.wa ?? '').split('?text=')[1] ?? '')
    expect(waText).toBe(en.waText)
    const mail = links.mail ?? ''
    expect(decodeURIComponent(/subject=([^&]*)/.exec(mail)?.[1] ?? '')).toBe(en.subject)
    expect(decodeURIComponent(/body=(.*)$/.exec(mail)?.[1] ?? '')).toBe(en.body)
  })
})

describe('when the gallery’s channels have not arrived yet (OA2)', () => {
  it('each missing channel answers a null link, never a fake number', () => {
    const message = itemMessage(textOf('en'), ITEM)
    expect(talkLinks({ whatsapp: null, email: null }, message)).toEqual({
      wa: null,
      mail: null,
      address: null,
    })
    const one = talkLinks({ whatsapp: '+62 812 3456 7890', email: null }, message)
    expect(one.wa).not.toBeNull()
    expect(one.mail).toBeNull()
  })

  it('a number with no digits (a placeholder typed into settings) is no number at all', () => {
    const message = itemMessage(textOf('en'), ITEM)
    expect(talkLinks({ whatsapp: 'TBC', email: '  ' }, message)).toEqual({
      wa: null,
      mail: null,
      address: null,
    })
  })

  it('the address travels as text beside the mail link (§8: visitors without a mail app)', () => {
    const links = talkLinks(
      { whatsapp: null, email: 'gallery@indies.test' },
      sellMessage(textOf('en'), 'a chart'),
    )
    expect(links.address).toBe('gallery@indies.test')
  })
})
