/** The makers index's A–Z grouping (14.6): a maker files under its name's first letter, accents
 * dropped ("Évrard" under E); a name starting with anything else files under "#". */
import type { MakerIndexItemVM } from '../../../server/gallery/makers/view-models'

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
export const OTHER_LETTER = '#'

export type LetterGroup = {
  readonly letter: string
  readonly items: readonly MakerIndexItemVM[]
}

export function initialOf(name: string): string {
  const first = name
    .normalize('NFD')
    .replace(/[^A-Za-z]/g, '')
    .charAt(0)
    .toUpperCase()
  return first === '' ? OTHER_LETTER : first
}

export function groupByLetter(items: readonly MakerIndexItemVM[]): readonly LetterGroup[] {
  const groups = new Map<string, MakerIndexItemVM[]>()
  for (const item of items) {
    const letter = initialOf(item.name)
    groups.set(letter, [...(groups.get(letter) ?? []), item])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === OTHER_LETTER ? 1 : b === OTHER_LETTER ? -1 : a.localeCompare(b)))
    .map(([letter, list]) => ({
      letter,
      items: [...list].sort((a, b) => a.name.localeCompare(b.name)),
    }))
}

export const letterId = (letter: string): string =>
  `letter-${letter === OTHER_LETTER ? 'other' : letter.toLowerCase()}`
