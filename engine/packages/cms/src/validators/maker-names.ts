/**
 * A maker's other spellings and authority links (CONTENT-MODEL.md §3): aliases — Valentyn beside
 * Valentijn, the spellings search already understands (C2 `MakerVM.aliases`) — and `sameAs`, the
 * Wikidata and ULAN records a maker page also emits as JSON-LD `sameAs`. Pure.
 */
import { nameKey } from './place-historical-names'

/** Per-alias errors by index: a repeat, or the maker's own name again. */
export function aliasErrors(
  aliases: readonly (string | null | undefined)[],
  name: string | null | undefined,
): (string | undefined)[] {
  const errors: (string | undefined)[] = []
  const own = name ? nameKey(name) : null
  const seen = new Map<string, number>()
  aliases.forEach((alias, index) => {
    if (!alias || alias.trim() === '') {
      errors[index] = 'Give the other spelling, or remove the row.'
      return
    }
    const key = nameKey(alias)
    if (key === own) {
      errors[index] = 'This is the name itself; list other spellings only.'
      return
    }
    const first = seen.get(key)
    if (first === undefined) seen.set(key, index)
    else errors[index] = `"${alias.trim()}" is already listed (row ${first + 1}).`
  })
  return errors
}

/** The same record twice, whatever the trailing slash or the case of the host. */
export function sameAsKey(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${parsed.pathname.replace(/\/+$/, '')}${parsed.search}`
  } catch {
    return url.trim()
  }
}

/** Per-link errors by index: the same authority record listed twice. */
export function sameAsErrors(urls: readonly (string | null | undefined)[]): (string | undefined)[] {
  const errors: (string | undefined)[] = []
  const seen = new Map<string, number>()
  urls.forEach((url, index) => {
    if (!url) return
    const key = sameAsKey(url)
    const first = seen.get(key)
    if (first === undefined) seen.set(key, index)
    else errors[index] = `This record is already linked (row ${first + 1}).`
  })
  return errors
}
