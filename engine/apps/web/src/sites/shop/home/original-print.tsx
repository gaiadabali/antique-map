/**
 * One of the gallery's own originals, framed on the shop's well (`loadOriginals()`): the real
 * antique a print is made from, with its title and date under it when `captioned`. While the read
 * streams, or if the gallery has no pictured work, one of the shop's own prints holds the place
 * (`FeaturedPrint`), so the section never shows an empty frame.
 */
import { Suspense } from 'react'

import { PrintTile, ResponsiveImage, printAspectOf, printRatioOf } from '../../../shared/ui'
import { loadOriginals, type OriginalVM } from '../../../server/shop/home/load-originals'
import { FeaturedPrint } from './featured-print'
import styles from './sections.module.css'

type Props = {
  readonly locale: 'en' | 'id'
  /** Which original (0 the first). */
  readonly index: number
  readonly sizes: string
  readonly className?: string
  /** The title and date under the frame. */
  readonly captioned?: boolean
}

export function OriginalPrint(props: Props) {
  const fallback = (
    <FeaturedPrint
      locale={props.locale}
      index={props.index}
      sizes={props.sizes}
      className={props.className}
    />
  )
  return (
    <Suspense fallback={fallback}>
      <Original {...props} fallback={fallback} />
    </Suspense>
  )
}

async function Original({
  locale,
  index,
  sizes,
  className,
  captioned = false,
  fallback,
}: Props & { readonly fallback: React.ReactNode }) {
  let originals: readonly OriginalVM[] = []
  try {
    originals = await loadOriginals(locale)
  } catch {
    originals = []
  }
  const original = originals[index] ?? originals[0]
  if (original === undefined) return fallback
  const ratio = printRatioOf(original.image)
  return (
    <figure className={styles.original}>
      <PrintTile ratio={ratio} className={className}>
        <ResponsiveImage
          variant="fill"
          aspectRatio={printAspectOf(ratio)}
          src={original.image.url}
          srcSet={original.image.srcSet}
          alt={original.image.alt || original.title}
          sizes={sizes}
          unoptimized
        />
      </PrintTile>
      {captioned && (
        <figcaption className={styles.originalCaption}>
          {original.title}
          {original.date ? <span> · {original.date}</span> : null}
        </figcaption>
      )}
    </figure>
  )
}
