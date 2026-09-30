/**
 * Two fixture items, by public id, with a slug per locale (CONTENT-MODEL.md: `slug` is localised).
 * 1706's current slug has a character outside ASCII, so its URL is percent-encoded — the case a
 * `Location` encoded twice would turn into a redirect loop — and 1726's is plain `bali`, the slug a
 * second decode of `b%61li` would wrongly match (TASKS.md 4.1.e, MIGRATION.md §6).
 */
import type { LocaleCode } from '@engine/config/schema'

type Localised = Readonly<Record<LocaleCode, string>>

export type SpikeItem = {
  readonly publicId: number
  readonly slug: Localised
  readonly title: Localised
}

export const SPIKE_ITEMS: readonly SpikeItem[] = [
  {
    publicId: 1706,
    slug: { en: 'café-de-java', id: 'kafe-di-jawa', nl: 'café-de-java' },
    title: {
      en: 'Café de Java, a coffee house on the Batavia road',
      id: 'Kafe di Jawa, kedai kopi di jalan Batavia',
      nl: 'Café de Java, een koffiehuis aan de weg naar Batavia',
    },
  },
  {
    publicId: 1726,
    slug: { en: 'bali', id: 'bali', nl: 'bali' },
    title: {
      en: 'Bali, from an imagined survey',
      id: 'Bali, dari survei khayalan',
      nl: 'Bali, naar een verzonnen opmeting',
    },
  },
]
