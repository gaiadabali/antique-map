/**
 * The tool definitions each site's model sees (AI.md §2.4), `strict: true` so arguments always
 * match. Lengths and counts the API's strict schemas cannot express are stated in the
 * descriptions and enforced by `./validate`, which checks every call against the same rules
 * before anything runs. The list is deterministic per site — same order, same bytes — so the
 * prompt cache holds (AI.md §2.1 step 4). No tool writes but `create_lead`, and that one only
 * asks the server to show the visitor a consent form.
 */
import 'server-only'

import type Anthropic from '@anthropic-ai/sdk'

import { LEAD_KINDS, type SiteKey } from '../types'

export const OBJECT_TYPES = [
  'map',
  'sea-chart',
  'city-plan',
  'view',
  'print',
  'photograph',
  'book',
  'atlas',
  'poster',
  'document',
  'other',
] as const

export const HANDOFF_TOPICS = [
  'item_enquiry',
  'price',
  'authenticity',
  'sell_to_us',
  'partnership',
  'order',
  'delivery',
  'general',
] as const
export type HandoffTopic = (typeof HANDOFF_TOPICS)[number]

export const TOOL_NAMES = [
  'search_catalogue',
  'get_item',
  'store_info',
  'delivery_info',
  'handoff_link',
  'create_lead',
] as const
export type ToolName = (typeof TOOL_NAMES)[number]

type Schema = Anthropic.Tool.InputSchema

const object = (properties: Record<string, unknown>, required: string[] = []): Schema => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
})

const text = (description: string) => ({ type: 'string', description })
const itemIds = {
  type: 'array',
  items: { type: 'string' },
  description:
    'Ids of items returned by search_catalogue or get_item in this conversation; at most 6.',
}

function searchTool(site: SiteKey): Anthropic.Tool {
  const filters =
    site === 'gallery'
      ? object({
          place: text('A place name, modern or historical (Bali, Batavia, Celebes).'),
          maker: text('A cartographer, engraver, publisher or photographer.'),
          period: text('A date or period as catalogued, such as 1726 or 18th century.'),
          objectType: { type: 'string', enum: [...OBJECT_TYPES] },
        })
      : object({ category: text('A product category, such as prints or homeware.') })
  return {
    name: 'search_catalogue',
    description:
      site === 'gallery'
        ? 'Search the gallery’s published antiques. Returns id, title, a one-line summary, url, image and status label for each match. Query up to 80 characters.'
        : 'Search the shop’s published products. Returns id, title, category, url, image, priceLabel and whether it is in stock. Query up to 80 characters.',
    input_schema: object(
      {
        query: text('Words to search for in titles; may be empty when filters are given.'),
        filters,
        limit: { type: 'integer', description: 'How many results, 1 to 6. Default 4.' },
      },
      ['query'],
    ),
    strict: true,
  }
}

const getItem: Anthropic.Tool = {
  name: 'get_item',
  description:
    'The public details of one item, exactly as its page shows them. Use an id from search_catalogue or the page the visitor is on.',
  input_schema: object({ id: text('The item id.') }, ['id']),
  strict: true,
}

const storeInfo: Anthropic.Tool = {
  name: 'store_info',
  description:
    'Name, area, address and opening hours of the shop’s stores, optionally only those matching an area such as Ubud. Never stock levels.',
  input_schema: object({ area: text('An area or store name, up to 80 characters.') }),
  strict: true,
}

function deliveryTool(site: SiteKey): Anthropic.Tool {
  return {
    name: 'delivery_info',
    description:
      site === 'gallery'
        ? 'How shipping works for the gallery’s antiques.'
        : 'The shop’s delivery fee bands by distance, the delivery reach and the free-delivery threshold.',
    input_schema: object({}),
    strict: true,
  }
}

const handoffLink: Anthropic.Tool = {
  name: 'handoff_link',
  description:
    'Show the visitor a button that opens WhatsApp or email to the team, with the items and a short summary filled in. You never write the link yourself.',
  input_schema: object(
    {
      channel: { type: 'string', enum: ['whatsapp', 'email'] },
      topic: { type: 'string', enum: [...HANDOFF_TOPICS] },
      itemIds,
      summary: text(
        'The visitor’s question in one or two plain sentences, up to 300 characters, no links.',
      ),
    },
    ['channel', 'topic', 'itemIds'],
  ),
  strict: true,
}

const createLead: Anthropic.Tool = {
  name: 'create_lead',
  description:
    'When the visitor wants the team to contact them, ask the server to show a contact form. The visitor types their details into the form and consents; you never see or ask for them. Returns needs_consent.',
  input_schema: object(
    {
      kind: { type: 'string', enum: [...LEAD_KINDS] },
      summary: text('What the visitor wants, up to 500 characters, no contact details.'),
      itemIds,
    },
    ['kind', 'summary', 'itemIds'],
  ),
  strict: true,
}

const GALLERY_TOOLS: readonly Anthropic.Tool[] = [
  searchTool('gallery'),
  getItem,
  deliveryTool('gallery'),
  handoffLink,
  createLead,
]
const SHOP_TOOLS: readonly Anthropic.Tool[] = [
  searchTool('shop'),
  getItem,
  storeInfo,
  deliveryTool('shop'),
  handoffLink,
  createLead,
]

export function toolsFor(site: SiteKey): readonly Anthropic.Tool[] {
  return site === 'gallery' ? GALLERY_TOOLS : SHOP_TOOLS
}
