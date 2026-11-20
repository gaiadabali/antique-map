/**
 * The `pages` collection factory — a site's information and editorial pages (CONTENT-MODEL.md §6).
 * What every CMS's pages have: a localised title, the SEO group, an address (`slug`), drafts, and
 * the rule that a page publishes only with an English title (`./publish-guard`). What a page is
 * made of is the CMS's (`contentFields`): the shop's blocks, the gallery's intro, hero, body and
 * curated works.
 *
 * Drafts enabled, so public reads see published only (`publishedOrStaff`, `PAGES_ACCESS`). Owner
 * and editor write; the public reads published. A CMS that has store staff passes its own access
 * that refuses them. The address is unique — per site, while the one CMS keeps both sites' pages
 * (`site`). A change to a published page expires the site's cache through the CMS's own hooks.
 */
import { IMAGES_ONLY } from '../media/kinds'
import type { Access, CollectionConfig, Field } from 'payload'

import { hiddenFromAllButCatalogueStaff } from '../../access/hidden'
import { DRAFTED_ACCESS } from '../../access/published'
import { hasRole } from '../../access/user-roles'
import type { Bilingual } from '../../i18n'
import { insertedAt, siteKeyed, withSiteColumn, type SharedCollectionOptions } from '../options'
import { pagePublishGuard } from './publish-guard'

export { englishTitle, pagePublishGuard } from './publish-guard'

/** Who writes pages: the owner and the editors. */
export const pagesPublishers: Access = ({ req }) => hasRole(req.user, 'owner', 'editor')

/** Read published (drafts for the owner and editors); write, the owner and editors. */
export const PAGES_ACCESS = {
  ...DRAFTED_ACCESS,
  create: pagesPublishers,
  update: pagesPublishers,
  delete: pagesPublishers,
} as const

export const PAGES_VERSIONS = {
  drafts: { validate: true },
} as const

export type PagesOptions = SharedCollectionOptions & {
  /** What a page is made of, after its title on the Content tab. */
  readonly contentFields: readonly Field[]
  /** The CMS's own sidebar fields, before the address (after `site`) — the gallery's `kind`. */
  readonly sidebarFields?: readonly Field[]
  /** In place of `PAGES_ACCESS` — the one CMS's refuses store staff. */
  readonly access?: CollectionConfig['access']
  /** The list's description in the admin. */
  readonly description: Bilingual
  /** The address field's note. */
  readonly slugDescription: Bilingual
  /** Cache expiry after a change and a delete (the CMS knows its cache tags). */
  readonly hooks?: Pick<NonNullable<CollectionConfig['hooks']>, 'afterChange' | 'afterDelete'>
}

const seo: Field = {
  name: 'seo',
  type: 'group',
  label: { en: 'SEO', id: 'SEO' },
  admin: {
    description: {
      en: 'Optional. Left empty, the page’s title and first words are used.',
      id: 'Opsional. Bila kosong, judul dan kalimat pertama halaman yang dipakai.',
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      maxLength: 70,
      label: { en: 'Title', id: 'Judul' },
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      maxLength: 200,
      label: { en: 'Description', id: 'Deskripsi' },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      filterOptions: IMAGES_ONLY,
      label: { en: 'Social sharing picture', id: 'Gambar media sosial' },
      admin: {
        description: {
          en: 'Shown when the page is shared on WhatsApp, Facebook or X; best 1200 × 630. Left empty, the site’s own card is used.',
          id: 'Tampil saat halaman dibagikan di WhatsApp, Facebook atau X; ideal 1200 × 630. Bila kosong, kartu situs yang dipakai.',
        },
      },
    },
  ],
}

/** Lower-case letters, digits and single hyphens, at most 96 characters. */
export const validatePageSlug = (value: unknown) => {
  if (!value) return true
  const slug = String(value)
  if (slug.length > 96) return 'Keep the address to 96 characters.'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    return 'Use lower-case letters, digits and single hyphens only.'
  return true
}

export function pagesCollection(options: PagesOptions): CollectionConfig & { slug: 'pages' } {
  const { site } = options
  return {
    slug: 'pages',
    labels: {
      singular: { en: 'Page', id: 'Halaman' },
      plural: { en: 'Pages', id: 'Halaman' },
    },
    admin: {
      group: options.group,
      hidden: hiddenFromAllButCatalogueStaff,
      useAsTitle: 'title',
      defaultColumns: withSiteColumn(['title', 'slug', '_status', 'updatedAt'], 1, site),
      description: options.description,
    },
    access: options.access ?? PAGES_ACCESS,
    versions: PAGES_VERSIONS,
    hooks: {
      beforeChange: [pagePublishGuard],
      ...(options.hooks?.afterChange ? { afterChange: options.hooks.afterChange } : {}),
      ...(options.hooks?.afterDelete ? { afterDelete: options.hooks.afterDelete } : {}),
    },
    indexes: [{ fields: siteKeyed(site, ['slug']), unique: true }],
    fields: [
      {
        type: 'tabs',
        tabs: [
          {
            label: { en: 'Content', id: 'Konten' },
            fields: [
              {
                name: 'title',
                type: 'text',
                required: true,
                localized: true,
                maxLength: 200,
                label: { en: 'Title', id: 'Judul' },
              },
              ...options.contentFields,
            ],
          },
          {
            label: { en: 'Search engines', id: 'Mesin pencari' },
            fields: [seo],
          },
        ],
      },
      ...insertedAt(options.sidebarFields ?? [], 0, site),
      {
        name: 'slug',
        type: 'text',
        required: true,
        maxLength: 96,
        admin: { position: 'sidebar', description: options.slugDescription },
        validate: validatePageSlug,
      },
    ],
  }
}
