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

/**
 * An image on the media origin (`MEDIA_PUBLIC_URL`) is already a public derivative — a resized,
 * metadata-free AVIF/WebP from the C9 ladder — so Next's optimizer is skipped for it: re-encoding
 * would add nothing, and the optimizer refuses a remote URL no `remotePatterns` names (one build
 * serves every environment's media host). A local path still goes through the optimizer.
 */
const isRemote = (src: string) => /^https?:\/\//.test(src)

/** A Next/Image wrapper requiring `alt` and `sizes` with fixed or fill + ratio variants. */
export function ResponsiveImage(props: ResponsiveImageProps): React.ReactElement {
  const wrapperClass = [styles.wrapper, props.className].filter(Boolean).join(' ')
  const unoptimized = props.unoptimized === true || isRemote(props.src)

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
          unoptimized={unoptimized}
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
      unoptimized={unoptimized}
      className={`${wrapperClass} ${styles.fixed}`}
    />
  )
}
