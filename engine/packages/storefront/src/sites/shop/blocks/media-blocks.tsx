/**
 * A page's Video and PDF link blocks, drawn. The video is the browser's own player — controls
 * showing, never autoplaying, `preload="metadata"` so a page costs a few kilobytes until someone
 * presses play — with its description as its text alternative; the PDF is a button that opens it
 * in a new tab, its size beside it. Both files come from the site's own origin
 * (`/api/x/media/{id}`), so the page's CSP needs no new source. No third-party player.
 */
import { Button } from '@engine/ui'
import type { SiteLocale } from '@engine/config/sites'

import type { DocumentLinkVM, VideoVM } from '../../../server/shop/pages/blocks'
import { blockText, sizeLabel } from './copy'
import styles from './media-blocks.module.css'

type Props<Block> = { readonly block: Block; readonly locale: SiteLocale }

export function VideoSection({ block, locale }: Props<VideoVM>) {
  const t = blockText(locale)
  const { video } = block
  const describedBy = video.description ? `${block.id}-about` : undefined
  return (
    <section id={block.anchor ?? undefined} className={styles.section}>
      <figure className={styles.figure}>
        <video
          className={styles.video}
          controls
          playsInline
          preload="metadata"
          poster={block.poster?.url}
          aria-label={video.title}
          aria-describedby={describedBy}
        >
          <source src={video.url} type={video.mimeType} />
          <p>
            {t('blocks.video.fallback')} <a href={video.url}>{t('blocks.video.download')}</a>
          </p>
        </video>
        {block.caption ? <figcaption className={styles.caption}>{block.caption}</figcaption> : null}
      </figure>
      {video.description ? (
        <details className={styles.about}>
          <summary>{t('blocks.video.about')}</summary>
          <p id={describedBy}>{video.description}</p>
        </details>
      ) : null}
    </section>
  )
}

export function DocumentLinkSection({ block, locale }: Props<DocumentLinkVM>) {
  const t = blockText(locale)
  const { document } = block
  const meta =
    document.size === null
      ? t('blocks.document.metaNoSize')
      : t('blocks.document.meta', { size: sizeLabel(document.size, locale) })
  return (
    <section id={block.anchor ?? undefined} className={styles.section}>
      <div className={styles.document}>
        <Button
          variant="secondary"
          size="small"
          href={document.url}
          target="_blank"
          rel="noopener"
          type={document.mimeType}
        >
          {block.label}
          <span className={styles.visuallyHidden}>
            {' '}
            ({meta}, {t('blocks.document.newTab')})
          </span>
        </Button>
        <p className={styles.meta} aria-hidden="true">
          {meta}
        </p>
        {block.note ? <p className={styles.note}>{block.note}</p> : null}
      </div>
    </section>
  )
}
