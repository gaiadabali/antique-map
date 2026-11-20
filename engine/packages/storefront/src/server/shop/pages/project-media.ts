/**
 * The shop's Video and PDF link blocks (`@engine/cms` `collections/pages/blocks/media`) → the
 * sections a renderer draws. Pure, like `./project`: a block whose file is missing, of the wrong
 * kind or without its title is left out rather than drawn half.
 */
import { imageOf } from '../catalogue/images'
import { publicFileOf } from '../../media/public-file'
import type { ShopBlockVM } from './blocks'

type Row = Record<string, unknown>

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null

const anchorOf = (value: unknown): string | null => {
  const anchor = text(value)
  return anchor && /^[a-z0-9-]+$/.test(anchor) ? anchor : null
}

/** A Video or a PDF link block, or `null` for any other block or one that cannot be drawn. */
export function mediaBlockOf(row: Row, id: string): ShopBlockVM | null {
  switch (row.blockType) {
    case 'video': {
      const video = publicFileOf(row.video, 'video')
      return video === null
        ? null
        : {
            type: 'video',
            id,
            anchor: anchorOf(row.anchor),
            video,
            poster: imageOf(row.poster),
            caption: text(row.caption),
          }
    }
    case 'documentLink': {
      const document = publicFileOf(row.document, 'pdf')
      return document === null
        ? null
        : {
            type: 'documentLink',
            id,
            anchor: anchorOf(row.anchor),
            document,
            label: text(row.label) ?? document.title,
            note: text(row.note),
          }
    }
    default:
      return null
  }
}
