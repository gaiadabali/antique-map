/**
 * The small field builders the shop's page blocks share: a localised line or paragraph, a list of
 * lines, and a link an editor picks rather than types — a shop page by name (its address follows
 * the visitor's language: `/shop`, `/id/belanja`), a place on the same page (`#apply`), or a
 * full web address.
 */
import type { ArrayField, Field, GroupField, TextareaField, TextField } from 'payload'

type Label = { en: string; id: string }
type Options = { required?: boolean; max?: number; note?: Label }

/** A one-line text, translated per language. */
export function line(name: string, label: Label, options: Options = {}): TextField {
  return {
    name,
    type: 'text',
    label,
    localized: true,
    required: options.required ?? false,
    maxLength: options.max ?? 200,
    ...(options.note ? { admin: { description: options.note } } : {}),
  }
}

/** A paragraph, translated per language; a blank line starts a new paragraph. */
export function paragraph(name: string, label: Label, options: Options = {}): TextareaField {
  return {
    name,
    type: 'textarea',
    label,
    localized: true,
    required: options.required ?? false,
    maxLength: options.max ?? 2000,
    admin: { rows: 4, ...(options.note ? { description: options.note } : {}) },
  }
}

/** A short list of lines: the hero's signals, a story's facts. */
export function lines(name: string, label: Label, max = 6): ArrayField {
  return {
    name,
    type: 'array',
    label,
    maxRows: max,
    labels: { singular: { en: 'Line', id: 'Baris' }, plural: { en: 'Lines', id: 'Baris' } },
    fields: [line('text', { en: 'Text', id: 'Teks' }, { required: true, max: 120 })],
  }
}

/** The shop pages a link may name; each answers in the visitor's language. */
export const LINK_SURFACES = [
  'home',
  'browse',
  'collection',
  'partnership',
  'stores',
  'search',
  'tracking',
] as const
export type LinkSurface = (typeof LINK_SURFACES)[number]

const SURFACE_LABELS: Record<LinkSurface, Label> = {
  home: { en: 'Home', id: 'Beranda' },
  browse: { en: 'All products', id: 'Semua produk' },
  collection: { en: 'Collections', id: 'Koleksi' },
  partnership: { en: 'Partnership', id: 'Kemitraan' },
  stores: { en: 'Stores', id: 'Toko' },
  search: { en: 'Search', id: 'Cari' },
  tracking: { en: 'Track an order', id: 'Lacak pesanan' },
}

type Sibling = { to?: unknown }

/** A link: a shop page, a place on this page, or a web address. */
export function link(name: string, label: Label): GroupField {
  return {
    name,
    type: 'group',
    label,
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'to',
            type: 'select',
            label: { en: 'Goes to', id: 'Menuju' },
            defaultValue: 'browse',
            options: [
              ...LINK_SURFACES.map((value) => ({ value, label: SURFACE_LABELS[value] })),
              {
                value: 'anchor',
                label: { en: 'A section on this page', id: 'Bagian di halaman ini' },
              },
              { value: 'url', label: { en: 'Web address', id: 'Alamat web' } },
            ],
            admin: { width: '40%' },
          },
          {
            name: 'anchor',
            type: 'text',
            label: { en: 'Section', id: 'Bagian' },
            maxLength: 40,
            validate: (value: unknown, { siblingData }: { siblingData: Sibling }) =>
              siblingData?.to !== 'anchor' || /^[a-z0-9-]+$/.test(String(value ?? ''))
                ? true
                : 'The section’s name: lower-case letters, digits and hyphens, e.g. apply.',
            admin: {
              width: '60%',
              condition: (_data: unknown, sibling: Sibling) => sibling?.to === 'anchor',
              description: {
                en: 'A block’s section name, e.g. apply or process.',
                id: 'Nama bagian sebuah blok, mis. apply atau process.',
              },
            },
          },
          {
            name: 'url',
            type: 'text',
            label: { en: 'Web address', id: 'Alamat web' },
            maxLength: 500,
            validate: (value: unknown, { siblingData }: { siblingData: Sibling }) =>
              siblingData?.to !== 'url' || /^(https:\/\/|mailto:|\/)/.test(String(value ?? ''))
                ? true
                : 'Start with https://, mailto: or /.',
            admin: {
              width: '60%',
              condition: (_data: unknown, sibling: Sibling) => sibling?.to === 'url',
            },
          },
        ],
      },
    ],
  }
}

/** A section's name, so a link elsewhere on the page can point at it (`#process`). */
export function anchor(defaultValue?: string): Field {
  return {
    name: 'anchor',
    type: 'text',
    label: { en: 'Section name', id: 'Nama bagian' },
    maxLength: 40,
    ...(defaultValue ? { defaultValue } : {}),
    validate: (value: unknown) =>
      value === null || value === undefined || value === '' || /^[a-z0-9-]+$/.test(String(value))
        ? true
        : 'Lower-case letters, digits and hyphens only.',
    admin: {
      description: {
        en: 'Optional. A link to “a section on this page” uses this name.',
        id: 'Opsional. Tautan ke “bagian di halaman ini” memakai nama ini.',
      },
    },
  }
}
