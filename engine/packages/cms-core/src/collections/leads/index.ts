/**
 * The `leads` collection factory — people the client should talk to (CONTENT-MODEL.md §6; AI.md
 * §4; SECURITY.md §2.2): the gallery's enquiries and sellers, the shop's partnerships, and chat
 * hand-offs on both (PLAN-V2.md §4.1).
 *
 * Created only by the server's lead service through the Local API; public REST create is refused.
 * Owner-only read/update/delete. Editors and store staff see nothing. Status changes append a
 * history row automatically (`./status-history`). What a CMS adds: the admin's blocks (its own
 * import-map components), what a lead may be about (`items`), its own relations (the shop's
 * partner) and endpoints.
 */
import type { CollectionConfig, CollectionSlug, Endpoint, Field } from 'payload'

import { hiddenFromAllButOwner } from '../../access/hidden'
import { isOwner } from '../../access/user-roles'
import { insertedAt, withSiteColumn, type SharedCollectionOptions } from '../options'
import { CONTACT_GROUP, FOLLOW_UP_FIELDS } from './fields'
import { LEAD_KIND_LABELS, LEAD_KINDS, SOURCE_LABELS, SOURCES, type LeadKind } from './kinds'
import { appendStatusHistory } from './status-history'

export { CONTACT_GROUP, FOLLOW_UP_FIELDS } from './fields'
export {
  LEAD_KIND_LABELS,
  LEAD_KINDS,
  LEAD_STATUS_HISTORY_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
  SOURCE_LABELS,
  SOURCES,
  type LeadKind,
  type LeadSource,
  type LeadStatus,
  type StatusHistoryRow,
} from './kinds'
export { appendStatusHistory } from './status-history'

export const LEADS_ACCESS = {
  read: isOwner,
  create: isOwner,
  update: isOwner,
  delete: isOwner,
} as const

export type LeadsOptions = SharedCollectionOptions & {
  /** What a lead on this CMS may be, in the admin's order; every kind by default. */
  readonly kinds?: readonly LeadKind[]
  /** The admin's blocks at the top of the form — `ui` fields naming the CMS's own components. */
  readonly adminBlocks?: readonly Field[]
  /** What the person asked about: the collection(s) `items` relates to. */
  readonly items: CollectionSlug | CollectionSlug[]
  /** The CMS's own relations, after the chat session — the shop's partner. */
  readonly relations?: readonly Field[]
  /** The CMS's own endpoints — the shop's "create partner". */
  readonly endpoints?: Endpoint[]
}

export function leadsCollection(options: LeadsOptions): CollectionConfig & { slug: 'leads' } {
  const { site } = options
  const kinds = options.kinds ?? LEAD_KINDS
  const columns = ['payload.name', 'payload.message', 'kind', 'status', 'source', 'createdAt']
  return {
    slug: 'leads',
    labels: {
      singular: { en: 'Lead', id: 'Calon pembeli' },
      plural: { en: 'Leads', id: 'Calon pembeli' },
    },
    admin: {
      group: options.group,
      hidden: hiddenFromAllButOwner,
      useAsTitle: 'id',
      defaultColumns: withSiteColumn(columns, 3, site),
      description: {
        en: 'People the client should reply to: enquiries, sellers, partners and chat hand-offs.',
        id: 'Orang yang harus dijawab klien: pertanyaan, penjual, mitra, dan percakapan yang diteruskan.',
      },
    },
    access: LEADS_ACCESS,
    ...(options.endpoints ? { endpoints: options.endpoints } : {}),
    hooks: {
      beforeChange: [appendStatusHistory],
    },
    fields: [
      ...(options.adminBlocks ?? []),
      ...insertedAt<Field>(
        [
          {
            name: 'kind',
            type: 'select',
            required: true,
            options: kinds.map((value) => ({ value, label: LEAD_KIND_LABELS[value] })),
            admin: {
              position: 'sidebar',
              description: { en: 'What the person wants.', id: 'Apa yang diinginkan orang ini.' },
            },
          },
          {
            name: 'source',
            type: 'select',
            required: true,
            options: SOURCES.map((value) => ({ value, label: SOURCE_LABELS[value] })),
            admin: { position: 'sidebar' },
          },
        ],
        1,
        site,
      ),
      CONTACT_GROUP,
      {
        name: 'items',
        type: 'relationship',
        relationTo: options.items,
        hasMany: true,
        label: { en: 'Items', id: 'Barang' },
        admin: {
          description: {
            en: 'Works or products the person asked about.',
            id: 'Barang yang ditanyakan orang ini.',
          },
        },
      } as Field,
      {
        name: 'chatSession',
        type: 'relationship',
        relationTo: 'chat-sessions',
        label: { en: 'Chat session', id: 'Sesi chat' },
        admin: { position: 'sidebar' },
      },
      ...(options.relations ?? []),
      ...FOLLOW_UP_FIELDS,
    ],
  }
}
