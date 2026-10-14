import type { CSSProperties, ReactNode } from 'react'

import styles from './crossing.module.css'

type Props = {
  /** The picture's own width over height; the field's depth and the picture's width read it. */
  ratio: number
  /** What stands on the field: the title, the lede, the actions. */
  copy: ReactNode
  /** What follows the copy on the paper below the field (facts, a note). */
  aside?: ReactNode
  /** The picture: a `ResponsiveImage` with `variant="fill"` and this `ratio`, or an empty window. */
  picture: ReactNode
  /** The museum caption under the picture, on the paper. */
  caption?: ReactNode
  /** The field's pigment in the site's order (1 leads). */
  pigment?: 1 | 2 | 3
  /** `wash` keeps ink type on a light field; `full` lays the deep field with its own type (the shop's walnut). */
  strength?: 'wash' | 'full'
  /** Starts right under the header, cancelling the shell's top padding: a page's first block. */
  lead?: boolean
  /** `contain` keeps an original whole (never cropped); `cover` fills the window (a print). */
  fit?: 'contain' | 'cover'
  as?: 'section' | 'div'
  id?: string
  className?: string
  'aria-labelledby'?: string
}

/**
 * A page's opening (phase 17, re-toned Ivory and ink in phase 18): a full-bleed field holds the
 * copy, and the picture lies across the field's lower edge onto the paper — on a desktop as deep as
 * 62% of the picture (or the copy, whichever is more), on a phone overlapping the field's foot. No
 * frame and no shadow. On the gallery the field is its own paper, so the sheet simply lies beside
 * the words; on the shop it is the walnut field (`strength="full"`, cream type) the print crosses.
 */
export function Crossing({
  ratio,
  copy,
  aside,
  picture,
  caption,
  pigment = 1,
  strength = 'wash',
  lead = false,
  fit = 'contain',
  as: Tag = 'section',
  id,
  className,
  ...aria
}: Props) {
  const shaped = { '--picture-ratio': ratio } as CSSProperties
  return (
    <Tag
      id={id}
      className={[
        styles.crossing,
        styles[`p${pigment}`],
        strength === 'full' ? styles.full : '',
        lead ? styles.lead : '',
        fit === 'cover' ? styles.cover : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...aria}
    >
      <div className={styles.field} style={shaped} aria-hidden="true" />
      <div className={styles.copy}>{copy}</div>
      {aside !== undefined && <div className={styles.aside}>{aside}</div>}
      <figure className={styles.figure} style={shaped}>
        <div className={styles.picture}>{picture}</div>
        {caption !== undefined && <figcaption className={styles.caption}>{caption}</figcaption>}
      </figure>
    </Tag>
  )
}
