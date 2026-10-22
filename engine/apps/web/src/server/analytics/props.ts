/**
 * Prop validation for the event catalogue (ANALYTICS.md §4): one prop's shape, and the check that
 * turns an event's props into their cleaned, stored form — or `null`, which drops the event. A
 * prop the schema does not name drops the event (§3): nothing rides along unvalidated, and a
 * search query is re-redacted here, last, whatever the sender claims.
 */
import { redactQuery } from './path'

export type EventSite = 'both' | 'gallery' | 'shop'

/** One prop's shape: its kind, its bounds, and whether it may be left out. */
export type PropRule =
  | { readonly kind: 'enum'; readonly values: readonly string[]; readonly optional?: boolean }
  | {
      readonly kind: 'int'
      readonly min?: number
      readonly max?: number
      readonly optional?: boolean
    }
  | { readonly kind: 'string'; readonly max: number; readonly optional?: boolean }
  | { readonly kind: 'bool'; readonly optional?: boolean }
  /** `facets[]`: up to 50 `{ key, value }` pairs of the listing's filters. */
  | { readonly kind: 'facets'; readonly optional?: boolean }

export type EventSpec = {
  readonly sites: EventSite
  readonly props: Readonly<Record<string, PropRule>>
}

/** The cleaned props of one event, or `null` — its props are outside the schema. */
export function validProps(spec: EventSpec, props: unknown): Record<string, unknown> | null {
  if (props === null || props === undefined) return {}
  if (typeof props !== 'object' || Array.isArray(props)) return null
  const source = props as Record<string, unknown>
  const cleaned: Record<string, unknown> = {}
  for (const [key, rule] of Object.entries(spec.props)) {
    const value = source[key]
    if (value === undefined || value === null || value === '') {
      // A prop the event's schema names is required unless the rule says optional.
      if (!('optional' in rule && rule.optional)) return null
      continue
    }
    switch (rule.kind) {
      case 'enum':
        if (typeof value !== 'string' || !rule.values.includes(value)) return null
        cleaned[key] = value
        break
      case 'int': {
        if (typeof value !== 'number' || !Number.isInteger(value)) return null
        if (rule.min !== undefined && value < rule.min) return null
        if (rule.max !== undefined && value > rule.max) return null
        cleaned[key] = value
        break
      }
      case 'string': {
        if (typeof value !== 'string') return null
        if (value.length > rule.max) return null
        cleaned[key] = value
        break
      }
      case 'bool':
        if (typeof value !== 'boolean') return null
        cleaned[key] = value
        break
      case 'facets': {
        if (!Array.isArray(value) || value.length > 50) return null
        const pairs = []
        for (const entry of value) {
          if (typeof entry !== 'object' || entry === null) return null
          const { key: facetKey, value: facetValue } = entry as Record<string, unknown>
          if (typeof facetKey !== 'string' || typeof facetValue !== 'string') return null
          if (facetKey.length > 60 || facetValue.length > 120) return null
          pairs.push({ key: facetKey, value: facetValue })
        }
        cleaned[key] = pairs
        break
      }
    }
  }
  // A prop the schema does not name drops the event (§3): nothing rides along unvalidated.
  for (const key of Object.keys(source)) {
    if (!(key in spec.props)) return null
  }
  if (typeof cleaned.query === 'string') cleaned.query = redactQuery(cleaned.query)
  return cleaned
}
