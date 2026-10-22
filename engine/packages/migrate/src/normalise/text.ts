/** Small text helpers the parsers share. */

/** Trims and collapses whitespace (non-breaking spaces included); `null` stays `null`. */
export function clean(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  // JavaScript's \s already covers the non-breaking spaces (U+00A0, U+2007, U+202F).
  return value.replace(/\s+/g, ' ').trim()
}

/** True for a value that holds nothing: absent, empty or whitespace. */
export function isBlank(value: string | null | undefined): boolean {
  const cleaned = clean(value)
  return cleaned === null || cleaned === ''
}

/** A comparison key: lower case, accents and punctuation folded, spaces collapsed. */
export function key(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim()
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name.startsWith('#x') || name.startsWith('#X'))
      return String.fromCodePoint(parseInt(name.slice(2), 16))
    if (name.startsWith('#')) return String.fromCodePoint(Number(name.slice(1)))
    return ENTITIES[name.toLowerCase()] ?? whole
  })
}

/** HTML to plain text: tags become spaces, entities are decoded, whitespace collapsed. */
export function htmlToText(html: string): string {
  return clean(decodeEntities(html.replace(/<[^>]*>/g, ' '))) ?? ''
}

/** Escapes a phrase for use inside a RegExp. */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
