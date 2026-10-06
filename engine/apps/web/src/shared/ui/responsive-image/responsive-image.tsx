import Image from 'next/image'
import type { CSSProperties } from 'react'

import styles from './responsive-image.module.css'

type BaseProps = {
  readonly src: string
  readonly alt: string
  readonly sizes: string
  readonly priority?: boolean
  /**
   * Serves `src` as is, never through Next's optimiser (and so never in its cache): for a private
   * image that must not be fetched or kept outside its own route, like the tracking page's photo.
   */
  readonly unoptimized?: boolean
  readonly className?: string
}

export type ResponsiveImageProps =
  | (BaseProps & {
      readonly variant: 'fixed'
      readonly width: number
      readonly height: number
    })
  | (BaseProps & {
      readonly variant: 'fill'
      readonly aspectRatio: `${number} / ${number}` | `${number}/${number}` | string
    })

/** A Next/Image wrapper requiring `alt` and `sizes` with fixed or fill + ratio variants. */
export function ResponsiveImage(props: ResponsiveImageProps): React.ReactElement {
  const wrapperClass = [styles.wrapper, props.className].filter(Boolean).join(' ')

  if (props.variant === 'fill') {
    const style = { '--ratio': props.aspectRatio } as CSSProperties
    return (
      <div className={`${wrapperClass} ${styles.fill}`} style={style}>
        <Image
          src={props.src}
          alt={props.alt}
          fill
          sizes={props.sizes}
          priority={props.priority}
          unoptimized={props.unoptimized}
          className={styles.image}
        />
      </div>
    )
  }

  return (
    <Image
      src={props.src}
      alt={props.alt}
      width={props.width}
      height={props.height}
      sizes={props.sizes}
      priority={props.priority}
      unoptimized={props.unoptimized}
      className={`${wrapperClass} ${styles.fixed}`}
    />
  )
}
