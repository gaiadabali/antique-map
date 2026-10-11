/**
 * The item page's media, in pieces for the shared `Crossing` (Outline Colour 17.4): the lead
 * sheet whole on the field's edge (`LeadPicture`: no mat, no frame), then, on the paper under it,
 * the Zoom door and the other images as small contained windows (`MediaCaption`). An original is
 * never cropped (DESIGN-SYSTEM.md §7).
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

/**
 * The sheet's true shape for the page's crossing: the window hugs the sheet, so the sheet is as
 * large as the screen allows and the controls under it align with its edge. Only an extreme strip
 * is held (between 2:5 and 5:2), and an unknown size reads as a portrait sheet.
 */
export function sheetShape(image: Pick<ItemImage, 'width' | 'height'>): number {
  if (image.width && image.height) return Math.min(2.5, Math.max(0.4, image.width / image.height))
  return 4 / 5
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

/** The lead image: the one a page leads with, else the first, else none. */
export function leadImage(images: readonly ItemImage[], leadIndex: number): ItemImage | null {
  return images[leadIndex] ?? images[0] ?? null
}

/** The lead sheet, whole, lying on the colour: the `Crossing`'s `picture`. */
export function LeadPicture({
  lead,
  ratio,
}: {
  readonly lead: ItemImage | null
  readonly ratio: number
}): React.ReactElement {
  if (lead === null) return <div className={styles.empty} style={{ aspectRatio: ratio }} />
  return (
    <ResponsiveImage
      variant="fill"
      aspectRatio={`${ratio} / 1`}
      src={lead.url}
      srcSet={lead.srcSet}
      alt={lead.alt}
      sizes="(max-width: 63.99rem) 100vw, 55vw"
      priority
      crossOrigin="anonymous"
    />
  )
}

/** Under the sheet, on the paper: a mock-up note, the Zoom door, the other images. */
export function MediaCaption({
  images,
  leadIndex,
  locale,
}: {
  readonly images: readonly ItemImage[]
  readonly leadIndex: number
  readonly locale: Parameters<typeof itemText>[0]
}): React.ReactElement {
  const t = itemText(locale)
  const lead = leadImage(images, leadIndex)
  const others = images.filter((image) => image !== lead)
  return (
    <div className={styles.media}>
      {lead !== null && lead.syntheticLabel !== null && (
        <p className={styles.mockupNote}>{t.code('image.synthetic', lead.syntheticLabel)}</p>
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
