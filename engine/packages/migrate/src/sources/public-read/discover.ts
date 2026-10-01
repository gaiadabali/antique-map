/**
 * Finds every URL a fetched page points at: anchors, images, the viewer's
 * image list inside inline scripts, and the category tree the old pages embed
 * as a script variable. It reads HTML with a real parser and scripts with a
 * bracket-balanced JSON scan — never by guessing at markup with a regex over
 * the whole page.
 */
import { parse, type HTMLElement } from 'node-html-parser'

import type { CategoryTreeConfig } from './config.ts'

export type FoundUrl = { href: string; via: 'a' | 'img' | 'script' | 'tree' }

export type LegacyCategory = {
  id: number
  parentId: number | null
  slug: string
  name: string
  productsCount: number | null
  active: string | null
  visible: string | null
}

/** The JSON value that starts at `text[start]` (`[` or `{`), or null if unbalanced. */
export function sliceJson(text: string, start: number): string | null {
  const open = text[start]
  if (open !== '[' && open !== '{') return null
  let depth = 0
  let inString = false
  for (let index = start; index < text.length; index += 1) {
    const char = text[index]
    if (inString) {
      if (char === '\\') index += 1
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') inString = true
    else if (char === '[' || char === '{') depth += 1
    else if (char === ']' || char === '}') {
      depth -= 1
      if (depth === 0) return text.slice(start, index + 1)
    }
  }
  return null
}

type RawCategory = {
  id?: unknown
  parent_id?: unknown
  slug?: unknown
  name?: unknown
  products_count?: unknown
  active?: unknown
  visible?: unknown
  child?: unknown
}

function flatten(nodes: unknown, out: LegacyCategory[]): void {
  if (!Array.isArray(nodes)) return
  for (const node of nodes as RawCategory[]) {
    if (typeof node !== 'object' || node === null) continue
    if (typeof node.id !== 'number' || typeof node.slug !== 'string') continue
    out.push({
      id: node.id,
      parentId: typeof node.parent_id === 'number' && node.parent_id > 0 ? node.parent_id : null,
      slug: node.slug,
      name: typeof node.name === 'string' ? node.name : node.slug,
      productsCount: typeof node.products_count === 'number' ? node.products_count : null,
      active: typeof node.active === 'string' ? node.active : null,
      visible: typeof node.visible === 'string' ? node.visible : null,
    })
    flatten(node.child, out)
  }
}

/** The embedded category tree, flattened, or an empty list when the page has none. */
export function extractCategoryTree(html: string, tree: CategoryTreeConfig): LegacyCategory[] {
  const marker = new RegExp(`\\bvar\\s+${tree.variable}\\s*=\\s*`)
  const match = marker.exec(html)
  if (match === null) return []
  const json = sliceJson(html, match.index + match[0].length)
  if (json === null) return []
  const out: LegacyCategory[] = []
  try {
    flatten(JSON.parse(json), out)
  } catch {
    return []
  }
  return out
}

export function categoryPath(tree: CategoryTreeConfig, category: LegacyCategory): string {
  return tree.pathTemplate
    .replace('{id}', String(category.id))
    .replace('{slug}', encodeURIComponent(category.slug))
}

const SCRIPT_URL = /https?:(?:\\?\/){2}[^"'\s<>]+/g

function scriptUrls(root: HTMLElement): string[] {
  const urls: string[] = []
  for (const script of root.querySelectorAll('script')) {
    if (script.getAttribute('src')) continue
    for (const match of script.text.matchAll(SCRIPT_URL)) urls.push(match[0].replace(/\\\//g, '/'))
  }
  return urls
}

export function discoverUrls(html: string, tree: CategoryTreeConfig | null): FoundUrl[] {
  const root = parse(html, { comment: false })
  const found: FoundUrl[] = []
  for (const anchor of root.querySelectorAll('a[href]')) {
    found.push({ href: anchor.getAttribute('href') ?? '', via: 'a' })
  }
  for (const image of root.querySelectorAll('img[src]')) {
    found.push({ href: image.getAttribute('src') ?? '', via: 'img' })
  }
  for (const href of scriptUrls(root)) found.push({ href, via: 'script' })
  if (tree !== null) {
    for (const category of extractCategoryTree(html, tree)) {
      found.push({ href: categoryPath(tree, category), via: 'tree' })
    }
  }
  return found
}
