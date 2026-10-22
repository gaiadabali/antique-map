/**
 * The shop home's sections as blocks (the redesign of 2026-10-20): the hero, the collections and
 * products rails, how a print is made, the trade story and the bridge to the originals. Each
 * holds its words; the pictures and products come from the catalogue (the hero's lead print, the
 * rails), so a block never goes stale when a product changes.
 */
import type { Block } from 'payload'

import { anchor, line, lines, link, paragraph } from './fields'

export const HomeHeroBlock: Block = {
  slug: 'homeHero',
  labels: {
    singular: { en: 'Hero — home', id: 'Hero — beranda' },
    plural: { en: 'Heroes — home', id: 'Hero — beranda' },
  },
  fields: [
    line('title', { en: 'Title', id: 'Judul' }, { required: true, max: 120 }),
    paragraph('lede', { en: 'Lede', id: 'Pengantar' }, { max: 400 }),
    {
      type: 'row',
      fields: [
        line('primaryLabel', { en: 'Button', id: 'Tombol' }, { max: 40 }),
        line('secondaryLabel', { en: 'Second link', id: 'Tautan kedua' }, { max: 40 }),
      ],
    },
    link('primaryLink', { en: 'Button goes to', id: 'Tombol menuju' }),
    link('secondaryLink', { en: 'Second link goes to', id: 'Tautan kedua menuju' }),
    lines('signals', { en: 'Signals under the buttons', id: 'Keunggulan di bawah tombol' }, 4),
  ],
}

export const CategoryRailBlock: Block = {
  slug: 'categoryRail',
  labels: {
    singular: { en: 'Collections rail', id: 'Deretan koleksi' },
    plural: { en: 'Collections rails', id: 'Deretan koleksi' },
  },
  fields: [
    line(
      'title',
      { en: 'Title', id: 'Judul' },
      {
        max: 80,
        note: {
          en: 'The rail shows every published category that holds a product, in the categories’ order.',
          id: 'Deretan menampilkan setiap kategori terbit yang punya produk, sesuai urutan kategori.',
        },
      },
    ),
    line('linkLabel', { en: 'Link under the rail', id: 'Tautan di bawah deretan' }, { max: 60 }),
  ],
}

export const ProductRailBlock: Block = {
  slug: 'productRail',
  labels: {
    singular: { en: 'Products rail', id: 'Deretan produk' },
    plural: { en: 'Products rails', id: 'Deretan produk' },
  },
  fields: [
    line('title', { en: 'Title', id: 'Judul' }, { max: 80 }),
    line('linkLabel', { en: 'Link under the rail', id: 'Tautan di bawah deretan' }, { max: 60 }),
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      label: { en: 'Only this category', id: 'Hanya kategori ini' },
      admin: {
        description: {
          en: 'Optional. Empty: the newest products of the whole shop.',
          id: 'Opsional. Kosong: produk terbaru dari seluruh toko.',
        },
      },
    },
    line('emptyTitle', { en: 'Title while the shop is empty', id: 'Judul saat toko kosong' }),
    paragraph('emptyBody', { en: 'Text while the shop is empty', id: 'Teks saat toko kosong' }),
  ],
}

export const StepsBlock: Block = {
  slug: 'steps',
  labels: {
    singular: { en: 'Numbered steps', id: 'Langkah bernomor' },
    plural: { en: 'Numbered steps', id: 'Langkah bernomor' },
  },
  fields: [
    line('title', { en: 'Title', id: 'Judul' }, { required: true, max: 160 }),
    {
      name: 'steps',
      type: 'array',
      label: { en: 'Steps', id: 'Langkah' },
      minRows: 1,
      maxRows: 6,
      fields: [
        line('title', { en: 'Title', id: 'Judul' }, { required: true, max: 120 }),
        paragraph('body', { en: 'Text', id: 'Teks' }, { max: 600 }),
      ],
    },
    anchor('process'),
  ],
}

export const StoryBlock: Block = {
  slug: 'story',
  labels: {
    singular: { en: 'Story with prints', id: 'Cerita dengan cetakan' },
    plural: { en: 'Stories with prints', id: 'Cerita dengan cetakan' },
  },
  fields: [
    line('title', { en: 'Title', id: 'Judul' }, { required: true, max: 160 }),
    paragraph('lead', { en: 'Lead sentence', id: 'Kalimat pembuka' }, { max: 400 }),
    paragraph('body', { en: 'Text', id: 'Teks' }, { max: 1200 }),
    lines('facts', { en: 'Facts', id: 'Fakta' }, 6),
    line('linkLabel', { en: 'Link', id: 'Tautan' }, { max: 60 }),
    link('link', { en: 'Link goes to', id: 'Tautan menuju' }),
  ],
}

export const OriginalsBlock: Block = {
  slug: 'originals',
  labels: {
    singular: { en: 'Bridge to the gallery', id: 'Jembatan ke galeri' },
    plural: { en: 'Bridges to the gallery', id: 'Jembatan ke galeri' },
  },
  fields: [
    line('label', { en: 'Small label', id: 'Label kecil' }, { max: 60 }),
    line('title', { en: 'Title', id: 'Judul' }, { required: true, max: 160 }),
    paragraph('body', { en: 'Text', id: 'Teks' }, { max: 800 }),
    line('linkLabel', { en: 'Link to the gallery', id: 'Tautan ke galeri' }, { max: 60 }),
  ],
}

export const HOME_BLOCKS: readonly Block[] = [
  HomeHeroBlock,
  CategoryRailBlock,
  ProductRailBlock,
  StepsBlock,
  StoryBlock,
  OriginalsBlock,
]
