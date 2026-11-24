/**
 * The shop home's bridge to the originals (`@engine/storefront/originals`; TASKS.md 23.5.c): this
 * app's reader asks the gallery's public read API for its two featured works, through the same
 * cached, time-limited client as "See the original". With no answer the home's frames hold the
 * shop's own prints, as they do with no reader. Imported for its effect by the shop's root layout,
 * which every shop page loads before it renders.
 */
import 'server-only'

import { registerOriginals, type OriginalVM } from '@engine/storefront/originals'

import { featuredOriginals } from './cached'

registerOriginals(async (locale): Promise<readonly OriginalVM[]> => {
  const works = await featuredOriginals(locale)
  return works.map((work) => ({
    title: work.title,
    date: work.date,
    maker: work.maker,
    image: {
      url: work.image.url,
      alt: work.image.alt,
      width: work.image.width,
      height: work.image.height,
    },
  }))
})
