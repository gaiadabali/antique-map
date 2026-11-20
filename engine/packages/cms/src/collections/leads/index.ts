/**
 * `leads` — people the client should talk to (CONTENT-MODEL.md §6; AI.md §4; SECURITY.md §2.2),
 * from the shared factory (`@engine/cms-core/collections/leads`): created only by the server's
 * lead service, owner-only, with an automatic status history. This one CMS adds the admin's reply,
 * source and "create partner" blocks, the shop's partner relation and its create-partner endpoint
 * (`./create-partner`), and keeps both sites' leads, so each names its site.
 */
import { leadsCollection } from '@engine/cms-core/collections/leads'

import { ADMIN_GROUPS } from '@engine/cms-core/admin/groups'
import { recordSiteField } from '../../fields/site'
import { partnershipTypeField } from '@engine/cms-shop/collections'
import { createPartnerEndpoint } from '@engine/cms-shop/collections/leads/create-partner'

export { LEADS_ACCESS } from '@engine/cms-core/collections/leads'

export const Leads = leadsCollection({
  group: ADMIN_GROUPS.orders,
  site: recordSiteField(),
  items: 'works',
  endpoints: [createPartnerEndpoint],
  adminBlocks: [
    {
      name: 'reply_block',
      type: 'ui',
      label: { en: 'Reply', id: 'Balas' },
      admin: { components: { Field: '@engine/cms/admin/views#LeadReplyBlock' } },
    },
    {
      name: 'source_block',
      type: 'ui',
      label: { en: 'Open the source', id: 'Buka sumbernya' },
      admin: {
        position: 'sidebar',
        components: { Field: '@engine/cms/admin/views#LeadSourceBlock' },
      },
    },
    {
      name: 'create_partner_block',
      type: 'ui',
      label: { en: '', id: '' },
      admin: {
        position: 'sidebar',
        components: { Field: '@engine/cms/admin/views#CreatePartnerButton' },
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
