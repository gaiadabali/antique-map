/**
 * The shop's general blocks, for any page (an about page, delivery and returns, a gift guide):
 * text, a picture beside text, questions and answers, a call to action, and the stores directory
 * (the stores themselves are the `stores` collection; this block places them on a page).
 */
import type { Block } from 'payload'

import { anchor, line, link, paragraph } from './fields'

export const TextBlock: Block = {
  slug: 'text',
  labels: { singular: { en: 'Text', id: 'Teks' }, plural: { en: 'Texts', id: 'Teks' } },
  fields: [
    line('title', { en: 'Title', id: 'Judul' }, { max: 160 }),
    paragraph(
      'body',
      { en: 'Text', id: 'Teks' },
      {
        required: true,
        max: 8000,
        note: {
          en: 'Leave an empty line between paragraphs.',
          id: 'Beri satu baris kosong di antara paragraf.',
        },
      },
    ),
    anchor(),
  ],
}

export const ImageTextBlock: Block = {
  slug: 'imageText',
  labels: {
    singular: { en: 'Picture and text', id: 'Gambar dan teks' },
    plural: { en: 'Pictures and texts', id: 'Gambar dan teks' },
  },
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: { en: 'Picture', id: 'Gambar' },
    },
    {
      name: 'side',
      type: 'select',
      label: { en: 'Picture on the', id: 'Gambar di sisi' },
      defaultValue: 'left',
      options: [
        { value: 'left', label: { en: 'Left', id: 'Kiri' } },
        { value: 'right', label: { en: 'Right', id: 'Kanan' } },
      ],
    },
    line('eyebrow', { en: 'Small label', id: 'Label kecil' }, { max: 60 }),
    line('title', { en: 'Title', id: 'Judul' }, { required: true, max: 160 }),
    paragraph('body', { en: 'Text', id: 'Teks' }, { max: 2000 }),
    line('linkLabel', { en: 'Link', id: 'Tautan' }, { max: 60 }),
    link('link', { en: 'Link goes to', id: 'Tautan menuju' }),
    anchor(),
  ],
}

export const FaqBlock: Block = {
  slug: 'faq',
  labels: {
    singular: { en: 'Questions and answers', id: 'Tanya jawab' },
    plural: { en: 'Questions and answers', id: 'Tanya jawab' },
  },
  fields: [
    line('title', { en: 'Title', id: 'Judul' }, { max: 160 }),
    {
      name: 'items',
      type: 'array',
      label: { en: 'Questions', id: 'Pertanyaan' },
      minRows: 1,
      maxRows: 30,
      fields: [
        line('question', { en: 'Question', id: 'Pertanyaan' }, { required: true, max: 200 }),
        paragraph('answer', { en: 'Answer', id: 'Jawaban' }, { required: true, max: 2000 }),
      ],
    },
    anchor(),
  ],
}

export const CallToActionBlock: Block = {
  slug: 'callToAction',
  labels: {
    singular: { en: 'Call to action', id: 'Ajakan' },
    plural: { en: 'Calls to action', id: 'Ajakan' },
  },
  fields: [
    line('title', { en: 'Title', id: 'Judul' }, { required: true, max: 160 }),
    paragraph('body', { en: 'Text', id: 'Teks' }, { max: 600 }),
    line('linkLabel', { en: 'Button', id: 'Tombol' }, { required: true, max: 40 }),
    link('link', { en: 'Button goes to', id: 'Tombol menuju' }),
  ],
}

export const StoreDirectoryBlock: Block = {
  slug: 'storeDirectory',
  labels: {
    singular: { en: 'Stores directory', id: 'Daftar toko' },
    plural: { en: 'Stores directories', id: 'Daftar toko' },
  },
  fields: [
    line('title', { en: 'Title', id: 'Judul' }, { required: true, max: 120 }),
    line(
      'lede',
      { en: 'Lede', id: 'Pengantar' },
      {
        max: 200,
        note: {
          en: 'Write {count} where the number of stores goes, e.g. “Stocked in {count} shops across Bali.”',
          id: 'Tulis {count} di tempat jumlah toko, mis. “Tersedia di {count} toko di Bali.”',
        },
      },
    ),
    line('empty', { en: 'Text while no store is listed', id: 'Teks saat belum ada toko' }),
  ],
}

export const CONTENT_BLOCKS: readonly Block[] = [
  TextBlock,
  ImageTextBlock,
  FaqBlock,
  CallToActionBlock,
  StoreDirectoryBlock,
]
