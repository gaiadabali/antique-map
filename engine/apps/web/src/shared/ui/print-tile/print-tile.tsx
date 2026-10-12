import type { CSSProperties, ReactNode } from 'react'

import styles from './print-tile.module.css'

type Props = {
  /**
   * The print: a `ResponsiveImage` (`variant="fill"`, its `aspectRatio` the same as `ratio`) or a
   * plain `<img>`, which fills the print's frame; or a `PrintTileNote` while there is none.
   */
  children: ReactNode
  /**
   * The print's own width over its height (`printRatioOf()`), so its shadow falls from its own
   * edges. Leave it out for a 4 : 5 print.
   */
  ratio?: number
  /** `default` for a grid or a lead; `small` for a thumbnail or a bag line (a narrower margin). */
  size?: 'default' | 'small'
  className?: string
}

const FALLBACK_RATIO = 4 / 5

/**
 * A print's shape from its image's pixels: width over height, held to a sane range (a strip or a
 * scroll still reads as a print), 4 : 5 when the size is unknown.
 */
export function printRatioOf(
  image: { readonly width: number | null; readonly height: number | null } | null,
): number {
  if (image === null || image.width === null || image.height === null) return FALLBACK_RATIO
  if (image.width <= 0 || image.height <= 0) return FALLBACK_RATIO
  return Math.min(2.5, Math.max(0.4, image.width / image.height))
}

/** The print's ratio as the `aspectRatio` a `ResponsiveImage` asks for. */
export function printAspectOf(ratio: number): string {
  return `${Math.round(ratio * 1000)} / 1000`
}

/**
 * A print hung on its tile (Ivory and ink, phase 18): an even 4 : 5 tile of the site's stone, the
 * print laid in it whole at its own shape, set a little above centre as a framer would, with one
 * soft, low shadow. Every tile in a grid is the same size whatever the print's shape, so a row
 * reads as one hang. Inside a link the print lifts a little under the pointer.
 */
export function PrintTile({ children, ratio, size = 'default', className }: Props) {
  const shape = ratio ?? FALLBACK_RATIO
  return (
    <div
      className={[styles.tile, styles[size], className].filter(Boolean).join(' ')}
      style={{ '--print-ratio': shape } as CSSProperties}
    >
      <div className={styles.stage}>
        <div className={styles.print}>{children}</div>
      </div>
    </div>
  )
}

/** The words a tile shows while it has no print: centred, small, muted, on the bare stone. */
export function PrintTileNote({ children }: { children: ReactNode }) {
  return <span className={styles.note}>{children}</span>
}
