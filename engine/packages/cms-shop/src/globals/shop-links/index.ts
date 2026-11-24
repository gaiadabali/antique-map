/**
 * A link in the shop's menu or footer (the plan's §3.5): a label in each language and where it
 * goes — a shop page, a category, a product, or a web address — picked rather than typed, so a
 * renamed page or product never leaves a dead link. The site makes the address in the visitor's
 * language (TASKS.md 27.5). Shared by `../shop-header` and `../shop-footer` (one global until
 * TASKS.md 27.6 split it in two menu entries), with who may read and write them.
 */
import { staffWithRoles } from '@engine/cms-core/access'
import { IN_DEFAULT_LOCALE_NOTE, requiredInDefaultLocale } from '@engine/cms-core/fields'
import type { ArrayField, Field, Validate } from 'payload'
import { shopPagesOnly } from '../../site'
import { relationship, text } from 'payload/shared'

type Bilingual = { en: string; id: string }

const ownerOrEditor = staffWithRoles('owner', 'editor')

/**
 * The header's and the footer's access: the owner and the editors read and write them; store
 * staff and the public read none of it through the API. The site reads them on the Local API, with
 * a `select` of what it shows (TASKS.md 27.5), the way it reads `site-settings`.
 */
export const SHOP_CHROME_ACCESS = {
  read: ownerOrEditor,
  update: ownerOrEditor,
} as const

export const LINK_TARGETS = ['page', 'category', 'product', 'url'] as const
export type LinkTarget = (typeof LINK_TARGETS)[number]

const TARGET_LABELS: Record<LinkTarget, Bilingual> = {
  page: { en: 'A page', id: 'Halaman' },
  category: { en: 'A collection', id: 'Koleksi' },
  product: { en: 'A product', id: 'Produk' },
  url: { en: 'A web address', id: 'Alamat web' },
}

const MISSING: Record<LinkTarget, string> = {
  page: 'Choose the page this link opens.',
  category: 'Choose the collection this link opens.',
  product: 'Choose the product this link opens.',
  url: 'Give the web address: https://…, mailto:… or a path such as /about.',
}

/** https://, mailto:, tel: or a path on this site — never `javascript:` or `//elsewhere`. */
export const LINK_URL = /^(https:\/\/[^\s]+|mailto:[^\s]+|tel:\+?[0-9 ]+|\/(?!\/)[^\s]*)$/

type Sibling = { target?: unknown }

const shows = (target: LinkTarget) => (_data: unknown, sibling: Sibling | undefined) =>
  sibling?.target === target

/** Payload's own check of the field, plus: present when the link's target is `target`. */
function neededFor(target: LinkTarget, own: Validate): Validate {
  return (value, args) => {
    const sibling = args.siblingData as Sibling | undefined
    if (sibling?.target !== target) return true
    const blank = value === null || value === undefined || value === ''
    if (blank) return MISSING[target]
    if (target === 'url' && !LINK_URL.test(String(value))) return MISSING.url
    return own(value, args)
  }
}

/** Where a link goes. `optional`: no target means no link (the announcement's). */
export function linkTarget(options: { optional?: boolean } = {}): Field {
  return {
    type: 'row',
    fields: [
      {
        name: 'target',
        type: 'select',
        label: { en: 'Goes to', id: 'Menuju' },
        required: !options.optional,
        ...(options.optional ? {} : { defaultValue: 'page' }),
        options: LINK_TARGETS.map((value) => ({ value, label: TARGET_LABELS[value] })),
        admin: { width: '35%', isClearable: Boolean(options.optional) },
      },
      {
        name: 'page',
        type: 'relationship',
        relationTo: 'pages',
        label: { en: 'Page', id: 'Halaman' },
        filterOptions: shopPagesOnly,
        validate: neededFor('page', relationship as Validate),
        admin: { width: '65%', condition: shows('page') },
      },
      {
        name: 'category',
        type: 'relationship',
        relationTo: 'categories',
        label: { en: 'Collection', id: 'Koleksi' },
        validate: neededFor('category', relationship as Validate),
        admin: { width: '65%', condition: shows('category') },
      },
      {
        name: 'product',
        type: 'relationship',
        relationTo: 'products',
        label: { en: 'Product', id: 'Produk' },
        validate: neededFor('product', relationship as Validate),
        admin: { width: '65%', condition: shows('product') },
      },
      {
        name: 'url',
        type: 'text',
        maxLength: 500,
        label: { en: 'Web address', id: 'Alamat web' },
        validate: neededFor('url', text as Validate),
        admin: { width: '65%', condition: shows('url') },
      },
    ],
  }
}

/** A link's label, translated: required in English, the Indonesian falling back to it. */
export function linkLabel(max = 60): Field {
  return {
    name: 'label',
    type: 'text',
    localized: true,
    maxLength: max,
    label: { en: 'Label', id: 'Label' },
    validate: requiredInDefaultLocale('Give the link its label in English.'),
    admin: { description: IN_DEFAULT_LOCALE_NOTE },
  }
}

/**
 * An ordered list of links (drag to reorder): the main menu, a footer column's links. Rows open
 * unfolded — never `initCollapsed` — so a link just added is ready to fill in with no click to
 * unfold it (27.5's timed run spent one there); a row is only a label and a target.
 */
export function linkList(name: string, label: Bilingual, maxRows: number): ArrayField {
  return {
    name,
    type: 'array',
    label,
    maxRows,
    labels: { singular: { en: 'Link', id: 'Tautan' }, plural: { en: 'Links', id: 'Tautan' } },
    fields: [linkLabel(), linkTarget()],
  }
}
