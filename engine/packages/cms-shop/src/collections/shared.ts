/**
 * The collections every CMS has, from `@engine/cms-core`'s factories, as the shop's CMS takes them
 * (PLAN-V2 §4.1): no `site` on any of them — this database holds the shop alone.
 *
 * - **users** — the shop's roles `owner`, `editor` and `store` (a store user works in exactly one
 *   store), with the owner's "Add a staff member" above the list (TASKS.md 27.6.c).
 * - **media** — a product photo's subject, role, provenance and alt when uploaded for a product
 *   (TASKS.md 27.1.d), and the derivative pipeline after an upload; no masters (the gallery's).
 * - **leads** — what a shop visitor asks or offers: about a product, a partnership (which of its
 *   two enquiries, `./leads/partnership-type`), a general contact, the chat, a newsletter sign-up
 *   (TASKS.md 28.1); the owner's "Create partner" on a partnership lead (TASKS.md 9.1.b).
 * - **redirects**, **events**, **chat-sessions** — the shop's own.
 */
import { USER_ROLES } from '@engine/cms-core/access'
import { ADMIN_GROUPS } from '@engine/cms-core/admin/groups'
import { chatSessionsCollection } from '@engine/cms-core/collections/chat-sessions'
import { eventsCollection } from '@engine/cms-core/collections/events'
import { leadsCollection } from '@engine/cms-core/collections/leads'
import { mediaCollection } from '@engine/cms-core/collections/media'
import { derivativesAfterUpload } from '@engine/cms-core/collections/media/pipeline-hook'
import { redirectsCollection } from '@engine/cms-core/collections/redirects'
import { usersCollection } from '@engine/cms-core/collections/users'

import { createPartnerEndpoint } from './leads/create-partner'
import { partnershipTypeField } from './leads/partnership-type'
import { forProductField, productImageDefaults } from './media/product-defaults'

const SHOP_VIEWS = '@engine/cms-shop/admin/views'

export const Users = usersCollection({
  group: ADMIN_GROUPS.settings,
  roles: USER_ROLES,
  beforeList: [`${SHOP_VIEWS}#AddStaffButton`],
}) satisfies { slug: 'users' }

export const Media = mediaCollection({
  group: ADMIN_GROUPS.content,
  intakeFields: [forProductField],
  beforeValidate: [productImageDefaults],
  afterChange: [derivativesAfterUpload],
}) satisfies { slug: 'media' }

export const Leads = leadsCollection({
  group: ADMIN_GROUPS.orders,
  kinds: ['ask', 'partnership', 'contact', 'chat', 'newsletter'],
  items: 'products',
  endpoints: [createPartnerEndpoint],
  adminBlocks: [
    {
      name: 'create_partner_block',
      type: 'ui',
      label: { en: '', id: '' },
      admin: {
        position: 'sidebar',
        components: { Field: `${SHOP_VIEWS}#CreatePartnerButton` },
      },
    },
  ],
  relations: [
    partnershipTypeField,
    {
      name: 'partner',
      type: 'relationship',
      relationTo: 'partners',
      label: { en: 'Partner', id: 'Mitra' },
      admin: {
        position: 'sidebar',
        description: {
          en: 'The partner created from this lead.',
          id: 'Mitra yang dibuat dari calon ini.',
        },
      },
    },
  ],
}) satisfies { slug: 'leads' }

export const Redirects = redirectsCollection({
  group: ADMIN_GROUPS.technical,
}) satisfies { slug: 'redirects' }

export const Events = eventsCollection({ group: ADMIN_GROUPS.technical }) satisfies {
  slug: 'events'
}

export const ChatSessions = chatSessionsCollection({
  group: ADMIN_GROUPS.settings,
  items: 'products',
}) satisfies { slug: 'chat-sessions' }
