import type { ReactNode } from 'react'

import styles from './band.module.css'

type Props = {
  children: ReactNode
  /**
   * Which of the site's grounds fills the band: 1 is the site's own (its paper on the gallery, its
   * warm-stone panel on the shop), 2 and 3 the bridge to the sister site; `ink` closes a page;
   * `paper` rests between.
   */
  pigment?: 1 | 2 | 3 | 'ink' | 'paper'
  /** `tint` pale, `wash` a field with ink type, `full` a deep field with its own type. */
  strength?: 'tint' | 'wash' | 'full'
  /** Pad top and bottom by the section rhythm (the default) or leave the content to pad itself. */
  pad?: boolean
  /** A hairline along one edge, where the band meets the paper without a change of ground. */
  edge?: 'top' | 'bottom'
  as?: 'section' | 'div' | 'aside'
  id?: string
  className?: string
  'aria-labelledby'?: string
  'aria-label'?: string
}

/**
 * A full-bleed field of flat colour (phase 17, re-toned Ivory and ink in phase 18): it spans the
 * viewport whatever centred column holds it, pads its content by the gutter, and on a deep field
 * re-points the ink roles (type, muted type, rules, focus, the accent and the action) so whatever
 * stands on it reads without asking. A work's window inside a band is clear: the sheet lies on it.
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
