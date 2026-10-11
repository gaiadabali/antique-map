import type { ReactNode } from 'react'

import styles from './band.module.css'

type Props = {
  children: ReactNode
  /**
   * Which of the site's pigments fills the band, in the site's order: 1 leads (the gallery's
   * verdigris, the shop's gamboge), then 2, then 3; `ink` closes a page; `paper` rests between.
   */
  pigment?: 1 | 2 | 3 | 'ink' | 'paper'
  /** `tint` pale, `wash` a field with ink type, `full` a deep field with its own type. */
  strength?: 'tint' | 'wash' | 'full'
  /** Pad top and bottom by the section rhythm (the default) or leave the content to pad itself. */
  pad?: boolean
  /** A band of the full pigment along one edge: the colourist's wash pooling at a border. */
  edge?: 'top' | 'bottom'
  as?: 'section' | 'div' | 'aside'
  id?: string
  className?: string
  'aria-labelledby'?: string
  'aria-label'?: string
}

/**
 * A full-bleed field of flat colour (Outline Colour, phase 17): it spans the viewport whatever
 * centred column holds it, pads its content by the gutter, and on a deep field re-points the ink
 * roles (type, muted type, rules, focus, the accent and the action) so whatever stands on it reads
 * without asking. A work's window inside a coloured band is clear: the sheet lies on the colour.
 */
export function Band({
  children,
  pigment = 'paper',
  strength = 'wash',
  pad = true,
  edge,
  as: Tag = 'section',
  id,
  className,
  ...aria
}: Props) {
  const tone = pigment === 'paper' || pigment === 'ink' ? styles[pigment] : styles[`p${pigment}`]
  return (
    <Tag
      id={id}
      className={[
        styles.band,
        tone,
        pigment === 'paper' || pigment === 'ink' ? '' : styles[strength],
        pad ? styles.pad : '',
        edge !== undefined ? styles[`edge-${edge}`] : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...aria}
    >
      {children}
    </Tag>
  )
}
