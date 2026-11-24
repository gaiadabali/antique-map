/**
 * The partnership page's sections as blocks (the redesign of 2026-10-20): a page hero with a
 * framed print, a band of facts, an offer with its terms, the enquiry (its form is the shop's:
 * the fields and their checks are code, the words around it are here) and the partners' sign-in.
 */
import type { Block } from 'payload'

import { anchor, line, lines, link, paragraph } from './fields'

export const PageHeroBlock: Block = {
  slug: 'pageHero',
  labels: {
    singular: { en: 'Hero — page', id: 'Hero — halaman' },
    plural: { en: 'Heroes — page', id: 'Hero — halaman' },
  },
  fields: [
    line('eyebrow', { en: 'Small label', id: 'Label kecil' }, { max: 60 }),
    line('title', { en: 'Title', id: 'Judul' }, { required: true, max: 160 }),
    paragraph('lede', { en: 'Lede', id: 'Pengantar' }, { max: 500 }),
    {
      type: 'row',
      fields: [
        line('primaryLabel', { en: 'Button', id: 'Tombol' }, { max: 40 }),
        line('secondaryLabel', { en: 'Second link', id: 'Tautan kedua' }, { max: 40 }),
      ],
    },
    link('primaryLink', { en: 'Button goes to', id: 'Tombol menuju' }),
    link('secondaryLink', { en: 'Second link goes to', id: 'Tautan kedua menuju' }),
  ],
}

export const FactStripBlock: Block = {
  slug: 'factStrip',
  labels: {
    singular: { en: 'Band of facts', id: 'Pita fakta' },
    plural: { en: 'Bands of facts', id: 'Pita fakta' },
  },
  fields: [lines('facts', { en: 'Facts', id: 'Fakta' }, 6)],
}

export const OfferBlock: Block = {
  slug: 'offer',
  labels: {
    singular: { en: 'Offer with terms', id: 'Penawaran dengan ketentuan' },
    plural: { en: 'Offers with terms', id: 'Penawaran dengan ketentuan' },
  },
  fields: [
    line('eyebrow', { en: 'Small label', id: 'Label kecil' }, { max: 60 }),
    line('title', { en: 'Title', id: 'Judul' }, { required: true, max: 160 }),
    paragraph('body', { en: 'Text', id: 'Teks' }, { max: 1200 }),
    {
      name: 'terms',
      type: 'array',
      label: { en: 'Terms', id: 'Ketentuan' },
      maxRows: 8,
      fields: [
        {
          type: 'row',
          fields: [
            line('label', { en: 'Label', id: 'Label' }, { required: true, max: 60 }),
            line('value', { en: 'Value', id: 'Isi' }, { required: true, max: 200 }),
          ],
        },
      ],
    },
    line('linkLabel', { en: 'Link', id: 'Tautan' }, { max: 60 }),
    link('link', { en: 'Link goes to', id: 'Tautan menuju' }),
    {
      name: 'warm',
      type: 'checkbox',
      label: { en: 'Warm background', id: 'Latar hangat' },
      defaultValue: false,
    },
    anchor(),
  ],
}

export const EnquiryBlock: Block = {
  slug: 'enquiry',
  labels: {
    singular: { en: 'Partnership enquiry form', id: 'Formulir kemitraan' },
    plural: { en: 'Partnership enquiry forms', id: 'Formulir kemitraan' },
  },
  fields: [
    line('eyebrow', { en: 'Small label', id: 'Label kecil' }, { max: 60 }),
    line('title', { en: 'Title', id: 'Judul' }, { required: true, max: 160 }),
    paragraph('body', { en: 'Text', id: 'Teks' }, { max: 800 }),
    line('talkFirst', { en: '“Prefer to talk first?”', id: '“Ingin bicara dulu?”' }, { max: 80 }),
    paragraph(
      'whatsappMessage',
      { en: 'Prepared WhatsApp message', id: 'Pesan WhatsApp siap kirim' },
      { max: 500 },
    ),
    anchor('apply'),
  ],
}

export const PartnerSignInBlock: Block = {
  slug: 'partnerSignIn',
  labels: {
    singular: { en: 'Partner sign-in', id: 'Masuk mitra' },
    plural: { en: 'Partner sign-ins', id: 'Masuk mitra' },
  },
  fields: [
    line('eyebrow', { en: 'Small label', id: 'Label kecil' }, { max: 60 }),
    line('title', { en: 'Title', id: 'Judul' }, { required: true, max: 160 }),
    paragraph('body', { en: 'Text', id: 'Teks' }, { max: 600 }),
  ],
}

export const PARTNERSHIP_BLOCKS: readonly Block[] = [
  PageHeroBlock,
  FactStripBlock,
  OfferBlock,
  EnquiryBlock,
  PartnerSignInBlock,
]
