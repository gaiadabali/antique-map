import { readFileSync } from 'node:fs'

/**
 * The committed files, each by a `new URL()` a bundler follows: the app's seed screen
 * (`/admin/seeds`) runs this inside the built server, where `import.meta.dirname` names no folder.
 */
export const VOCABULARY_FILES = {
  'places.json': new URL('./data/places.json', import.meta.url),
  'grades.json': new URL('./data/grades.json', import.meta.url),
  'terms.json': new URL('./data/terms.json', import.meta.url),
  'categories.json': new URL('./data/categories.json', import.meta.url),
  'makers.json': new URL('./data/makers.json', import.meta.url),
  gazetteer: new URL('../gazetteer.json', import.meta.url),
} as const

export const read = (file: URL) => JSON.parse(readFileSync(file, 'utf8'))
export const data = (file: Exclude<keyof typeof VOCABULARY_FILES, 'gazetteer'>) =>
  read(VOCABULARY_FILES[file])
