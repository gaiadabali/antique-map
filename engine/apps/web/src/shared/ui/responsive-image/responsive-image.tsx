import Image, { getImageProps } from 'next/image'
import type { CSSProperties } from 'react'
import { preload } from 'react-dom'

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
  /**
   * A remote image's own width ladder (`…/320.webp 320w, …/640.webp 640w`): the public
   * derivatives the view model names (`derivativeSrcSetOf()`). Given, the browser picks the rung
   * `sizes` asks for, so a 160 px card never downloads the 2,400 px top rung `src` names. Next's
   * optimizer has no part in it (`unoptimized`), so `<Image>` would drop the ladder.
   */
  readonly srcSet?: string | null
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

/**
 * A lead (above the fold, LCP) image: Next 16's `priority` is a deprecated alias of `preload`, whose
 * `<link rel=preload as=image>` and `<img>` carry no `fetchpriority`, so the browser fetches the
 * image at Low priority. `fetchPriority="high"` on both makes it a High fetch (7.4 Lighthouse).
 */
const leadProps = (lead: boolean | undefined) =>
  lead === true ? ({ preload: true, fetchPriority: 'high' } as const) : {}

/**
 * A remote image with its derivative ladder: Next's own `<img>` attributes (`getImageProps()`:
 * lazy unless lead, async decoding, the fill's absolute box), with the ladder and `sizes` put
 * back. A lead image is preloaded with the same ladder, at high priority, so the browser fetches
 * the one rung the `<img>` will choose, before the stylesheets and fonts are parsed.
 */
function LadderImage({
  props,
  srcSet,
  className,
}: {
  readonly props: ResponsiveImageProps
  readonly srcSet: string
  readonly className: string | undefined
}): React.ReactElement {
  const lead = props.priority === true
  const box =
    props.variant === 'fill'
      ? { fill: true as const }
      : { width: props.width, height: props.height }
  const { props: img } = getImageProps({
    src: props.src,
    alt: props.alt,
    ...box,
    unoptimized: true,
    ...(lead ? { loading: 'eager', fetchPriority: 'high' } : {}),
    className,
  })
  if (lead) {
    preload(props.src, {
      as: 'image',
      imageSrcSet: srcSet,
      imageSizes: props.sizes,
      fetchPriority: 'high',
    })
  }
  // `alt` is in `img`, from `getImageProps()`.
  return <img {...img} srcSet={srcSet} sizes={props.sizes} />
}

/** A Next/Image wrapper requiring `alt` and `sizes` with fixed or fill + ratio variants. */
export function ResponsiveImage(props: ResponsiveImageProps): React.ReactElement {
  const wrapperClass = [styles.wrapper, props.className].filter(Boolean).join(' ')
  const unoptimized = props.unoptimized === true || isRemote(props.src)
  const ladder =
    typeof props.srcSet === 'string' && props.srcSet !== '' && isRemote(props.src)
      ? props.srcSet
      : null

  if (props.variant === 'fill') {
    const style = { '--ratio': props.aspectRatio } as CSSProperties
    return (
      <div className={`${wrapperClass} ${styles.fill}`} style={style}>
        {ladder !== null ? (
          <LadderImage props={props} srcSet={ladder} className={styles.image} />
        ) : (
          <Image
            src={props.src}
            alt={props.alt}
            fill
            sizes={props.sizes}
            {...leadProps(props.priority)}
            unoptimized={unoptimized}
            className={styles.image}
          />
        )}
      </div>
    )
  }

  if (ladder !== null) {
    return (
      <LadderImage props={props} srcSet={ladder} className={`${wrapperClass} ${styles.fixed}`} />
    )
  }

  return (
    <Image
      src={props.src}
      alt={props.alt}
      width={props.width}
      height={props.height}
      sizes={props.sizes}
      {...leadProps(props.priority)}
      unoptimized={unoptimized}
      className={`${wrapperClass} ${styles.fixed}`}
    />
  )
}
