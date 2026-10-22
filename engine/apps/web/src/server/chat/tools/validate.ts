/**
 * Every tool call's arguments checked against the same rules `./schemas` declares, plus the
 * lengths and counts strict schemas cannot carry (AI.md §2.1 step 5). A call that fails is
 * answered with an error result and runs nothing. Unknown keys fail too: strict mode should make
 * them impossible, and this does not assume it.
 */
import 'server-only'

import { LEAD_KINDS, type HandoffChannel, type LeadKind, type SiteKey } from '../types'
import {
  HANDOFF_TOPICS,
  OBJECT_TYPES,
  TOOL_NAMES,
  type HandoffTopic,
  type ToolName,
} from './schemas'

export type ToolCall =
  | {
      readonly name: 'search_catalogue'
      readonly query: string
      readonly limit: number
      readonly filters: {
        readonly place?: string
        readonly maker?: string
        readonly period?: string
        readonly objectType?: string
        readonly category?: string
      }
    }
  | { readonly name: 'get_item'; readonly id: string }
  | { readonly name: 'store_info'; readonly area?: string }
  | { readonly name: 'delivery_info' }
  | {
      readonly name: 'handoff_link'
      readonly channel: HandoffChannel
      readonly topic: HandoffTopic
      readonly itemIds: readonly string[]
      readonly summary?: string
    }
  | {
      readonly name: 'create_lead'
      readonly kind: LeadKind
      readonly summary: string
      readonly itemIds: readonly string[]
    }

export type Validated = { ok: true; call: ToolCall } | { ok: false; reason: string }

type Obj = Record<string, unknown>

const isObj = (value: unknown): value is Obj =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

function onlyKeys(input: Obj, allowed: readonly string[]): string | null {
  const extra = Object.keys(input).filter((key) => !allowed.includes(key))
  return extra.length > 0 ? `unexpected argument ${extra[0]}` : null
}

function optionalText(input: Obj, key: string, max: number): string | undefined | Error {
  const value = input[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') return new Error(`${key} must be text`)
  if (value.length > max) return new Error(`${key} is longer than ${max} characters`)
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function ids(value: unknown): readonly string[] | Error {
  if (!Array.isArray(value)) return new Error('itemIds must be a list')
  if (value.length > 6) return new Error('at most 6 itemIds')
  if (!value.every((id) => typeof id === 'string' && /^[a-z0-9-]{1,200}$/i.test(id))) {
    return new Error('itemIds must be item ids')
  }
  return [...new Set(value as string[])]
}

const fail = (reason: string): Validated => ({ ok: false, reason })

function validateSearch(input: Obj, site: SiteKey): Validated {
  const bad = onlyKeys(input, ['query', 'filters', 'limit'])
  if (bad) return fail(bad)
  const query = typeof input.query === 'string' ? input.query : null
  if (query === null || query.length > 80) return fail('query must be text up to 80 characters')
  const limit = input.limit === undefined || input.limit === null ? 4 : input.limit
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 6) {
    return fail('limit must be 1 to 6')
  }
  const rawFilters = input.filters ?? {}
  if (!isObj(rawFilters)) return fail('filters must be an object')
  const keys = site === 'gallery' ? ['place', 'maker', 'period', 'objectType'] : ['category']
  const badFilter = onlyKeys(rawFilters, keys)
  if (badFilter) return fail(badFilter)
  const filters: Record<string, string> = {}
  for (const key of keys) {
    const value = optionalText(rawFilters, key, 80)
    if (value instanceof Error) return fail(value.message)
    if (value !== undefined) filters[key] = value
  }
  const objectType = filters.objectType
  if (objectType !== undefined && !(OBJECT_TYPES as readonly string[]).includes(objectType)) {
    return fail('objectType is not one of the listed types')
  }
  if (query.trim() === '' && Object.keys(filters).length === 0) {
    return fail('give a query or a filter')
  }
  return { ok: true, call: { name: 'search_catalogue', query: query.trim(), limit, filters } }
}

function validateHandoff(input: Obj): Validated {
  const bad = onlyKeys(input, ['channel', 'topic', 'itemIds', 'summary'])
  if (bad) return fail(bad)
  if (input.channel !== 'whatsapp' && input.channel !== 'email') return fail('channel is unknown')
  if (!(HANDOFF_TOPICS as readonly unknown[]).includes(input.topic)) return fail('topic is unknown')
  const itemIds = ids(input.itemIds)
  if (itemIds instanceof Error) return fail(itemIds.message)
  const summary = optionalText(input, 'summary', 300)
  if (summary instanceof Error) return fail(summary.message)
  return {
    ok: true,
    call: {
      name: 'handoff_link',
      channel: input.channel,
      topic: input.topic as HandoffTopic,
      itemIds,
      ...(summary === undefined ? {} : { summary }),
    },
  }
}

function validateLead(input: Obj): Validated {
  const bad = onlyKeys(input, ['kind', 'summary', 'itemIds'])
  if (bad) return fail(bad)
  if (!(LEAD_KINDS as readonly unknown[]).includes(input.kind)) return fail('kind is unknown')
  const summary = optionalText(input, 'summary', 500)
  if (summary instanceof Error) return fail(summary.message)
  if (summary === undefined) return fail('summary is required')
  const itemIds = ids(input.itemIds)
  if (itemIds instanceof Error) return fail(itemIds.message)
  return { ok: true, call: { name: 'create_lead', kind: input.kind as LeadKind, summary, itemIds } }
}

/** The call, checked; tools another site has are refused like unknown ones. */
export function validateToolCall(name: string, input: unknown, site: SiteKey): Validated {
  if (!(TOOL_NAMES as readonly string[]).includes(name)) return fail('unknown tool')
  if (name === 'store_info' && site !== 'shop') return fail('unknown tool')
  if (!isObj(input)) return fail('arguments must be an object')
  switch (name as ToolName) {
    case 'search_catalogue':
      return validateSearch(input, site)
    case 'get_item': {
      const bad = onlyKeys(input, ['id'])
      if (bad) return fail(bad)
      const id = input.id
      if (typeof id !== 'string' || !/^[a-z0-9-]{1,200}$/i.test(id))
        return fail('id is not an item id')
      return { ok: true, call: { name: 'get_item', id: id.toLowerCase() } }
    }
    case 'store_info': {
      const bad = onlyKeys(input, ['area'])
      if (bad) return fail(bad)
      const area = optionalText(input, 'area', 80)
      if (area instanceof Error) return fail(area.message)
      return { ok: true, call: { name: 'store_info', ...(area === undefined ? {} : { area }) } }
    }
    case 'delivery_info': {
      const bad = onlyKeys(input, [])
      return bad ? fail(bad) : { ok: true, call: { name: 'delivery_info' } }
    }
    case 'handoff_link':
      return validateHandoff(input)
    case 'create_lead':
      return validateLead(input)
  }
}
