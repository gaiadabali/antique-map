/**
 * The item page's media column (14.5): the lead sheet whole in a default contained mat, the
 * window taking the sheet's own shape, then the Zoom door, then the other images as compact
 * contained mats. An original is never cropped (DESIGN-SYSTEM.md §7).
 */
import type { ItemImage } from '../../../server/gallery/item/view-model'
import { Mat, ResponsiveImage } from '../../../shared/ui'
import { itemText, type ItemText } from './copy'
import styles from './item.module.css'
import { ZoomLazy, type ZoomLabels } from './zoom-lazy'

/** The sheet's own width over height, held between 4:5 and 3:2 so a long sheet still reads at size. */
export function leadRatio(image: Pick<ItemImage, 'width' | 'height'>): number {
  if (image.width && image.height) return Math.min(1.5, Math.max(0.8, image.width / image.height))
  return 4 / 3
}

/** The viewer's words, said on the server so no lexicon ships to the browser. */
export function zoomLabels(t: ItemText, images: readonly ItemImage[]): ZoomLabels {
  return {
    open: t('item.viewerOpen'),
    title: t('item.viewerTitle'),
    hint: t('item.viewerHint'),
    zoomIn: t('item.zoomIn'),
    zoomOut: t('item.zoomOut'),
    reset: t('item.zoomReset'),
    fullScreen: t('item.fullScreen'),
    lowResolution: t('item.lowResolution'),
    failed: t('item.viewerFailed'),
    // One name per image for the filmstrip: its role, and a synthetic image's label first.
    thumbs: images.map((image) => {
      const role = t.code('image.role', image.role)
      return image.syntheticLabel === null
        ? role
        : `${t.code('image.synthetic', image.syntheticLabel)}: ${role}`
    }),
  }
}

export function ItemMedia({
  images,
  leadIndex,
  locale,
}: {
  readonly images: readonly ItemImage[]
  readonly leadIndex: number
  readonly locale: Parameters<typeof itemText>[0]
}): React.ReactElement {
  const t = itemText(locale)
  const lead = images[leadIndex] ?? images[0] ?? null
  const others = images.filter((image) => image !== lead)
  return (
    <div className={styles.media}>
      {lead === null ? (
        <Mat ratio={4 / 3} fit="contain">
          {null}
        </Mat>
      ) : (
        <figure className={styles.figure}>
          <Mat fit="contain">
            <ResponsiveImage
              variant="fill"
              aspectRatio={`${leadRatio(lead)} / 1`}
              src={lead.url}
              srcSet={lead.srcSet}
              alt={lead.alt}
              sizes="(max-width: 63.99rem) 100vw, 55vw"
              priority
              crossOrigin="anonymous"
            />
          </Mat>
          {lead.syntheticLabel !== null && (
            <figcaption className={styles.mockupNote}>
              {t.code('image.synthetic', lead.syntheticLabel)}
            </figcaption>
          )}
        </figure>
      )}
      {images.length > 0 && <ZoomLazy images={images} labels={zoomLabels(t, images)} />}
      {others.length > 0 && (
        <ul className={styles.thumbs}>
          {others.map((image, at) => (
            <li key={`${image.url}-${at}`}>
              <Mat size="compact" fit="contain">
                <ResponsiveImage
                  variant="fill"
                  aspectRatio="1 / 1"
                  src={image.url}
                  srcSet={image.srcSet}
                  alt={image.alt}
                  sizes="(max-width: 63.99rem) 30vw, 14vw"
                  crossOrigin="anonymous"
                />
              </Mat>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
