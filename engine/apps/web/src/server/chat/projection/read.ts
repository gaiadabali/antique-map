/**
 * Reading a Payload document defensively: the projections take `unknown` documents and pick each
 * field by name, so nothing reaches a tool result that a mapper did not name. Shared by
 * `./works`, `./products` and `./stores`.
 */
import 'server-only'

import { redactMoney } from '../text/money'

export type Doc = Readonly<Record<string, unknown>>

export function asDoc(value: unknown): Doc | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Doc)
    : null
}

export function str(value: unknown, max = 300): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (trimmed === '') return null
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed
}

export function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function list(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : []
}

/** A populated relationship's field (`{ name }`), or `null` when it is an unpopulated id. */
export function relField(value: unknown, field: string, max = 200): string | null {
  return str(asDoc(value)?.[field], max)
}

/** The public URL of a populated media document, when it is a root-relative or https URL. */
export function mediaUrl(value: unknown): string | null {
  const url = str(asDoc(value)?.url, 2048)
  if (url === null) return null
  return url.startsWith('/') || url.startsWith('https://') ? url : null
}

/**
 * The words of a rich-text or blocks value (Lexical JSON, a C4 block run, or a plain string):
 * every `text` leaf, in order, joined. Structure, links and embedded media are dropped.
 */
export function plainText(value: unknown, max = 1500): string | null {
  const parts: string[] = []
  const walk = (node: unknown, depth: number): void => {
    if (depth > 40 || parts.length > 2000) return
    if (typeof node === 'string') {
      parts.push(node)
      return
    }
    if (Array.isArray(node)) {
      node.forEach((each) => walk(each, depth + 1))
      return
    }
    const doc = asDoc(node)
    if (doc === null) return
    if (typeof doc.text === 'string') parts.push(doc.text)
    for (const key of ['root', 'children', 'content', 'blocks', 'body', 'paragraphs']) {
      if (key in doc) walk(doc[key], depth + 1)
    }
  }
  walk(value, 0)
  return str(parts.join(' '), max)
}

/** Every string in a gallery tool result with any amount removed (but ids and URLs). */
export function redactStrings<T>(value: T, keep: ReadonlySet<string> = KEEP_AS_IS): T {
  const walk = (node: unknown, key: string | null): unknown => {
    if (typeof node === 'string') return key !== null && keep.has(key) ? node : redactMoney(node)
    if (Array.isArray(node)) return node.map((each) => walk(each, key))
    const doc = asDoc(node)
    if (doc === null) return node
    return Object.fromEntries(Object.entries(doc).map(([k, v]) => [k, walk(v, k)]))
  }
  return walk(value, null) as T
}

const KEEP_AS_IS: ReadonlySet<string> = new Set(['id', 'url', 'image', 'stockNumber'])
