/**
 * The shop home's last sections (the redesign of 2026-10-20, the handoff's Poster Club story and
 * editorial skeletons): a story — its words at the left, two of the shop's framed prints beside
 * them (no photographs of shops or hotels exist yet) — and the bridge to the originals: two of the
 * gallery's own antiques, one on the left half, one framed in the sister gallery's warm panel. The
 * words are the page's `story` and `originals` blocks.
 */
import type { OriginalsVM, StoryVM } from '../../../server/shop/pages/blocks'
import { linkProps } from '../blocks/link-props'
import { Caps, CapsLink } from '../ui/caps-link'
import { GALLERY_LIVE_LINK } from '../gallery-live'
import { FeaturedPrint } from './featured-print'
import { OriginalPrint } from './original-print'
import styles from './sections.module.css'

type Locale = { readonly locale: 'en' | 'id' }

/** A story (the home's trade and gifting): its words, facts and the way in, beside two prints. */
export function Story({ locale, block }: Locale & { readonly block: StoryVM }) {
  const titleId = `story-${block.id}`
  return (
    <section className={styles.story} aria-labelledby={titleId}>
      <div className={styles.storyText}>
        <h2 id={titleId} className={styles.storyTitle}>
          {block.title}
        </h2>
        {block.lead ? <p className={styles.storyLead}>{block.lead}</p> : null}
        {block.body ? <p className={styles.storyBody}>{block.body}</p> : null}
        {block.facts.length > 0 ? (
          <ul className={styles.facts}>
            {block.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        ) : null}
        {block.link ? <CapsLink {...linkProps(block.link)}>{block.link.label}</CapsLink> : null}
      </div>
      <div className={styles.storyPhotos} role="group" aria-label={block.title} tabIndex={0}>
        <FeaturedPrint
          locale={locale}
          index={1}
          sizes="(max-width: 56.25rem) 80vw, 33vw"
          className={styles.photo}
        />
        <FeaturedPrint
          locale={locale}
          index={2}
          sizes="(max-width: 56.25rem) 80vw, 33vw"
          className={styles.photo}
        />
      </div>
    </section>
  )
}

/** The bridge to the gallery's originals, on its own host (absolute, in the visitor's locale). */
export function Originals({ locale, block }: Locale & { readonly block: OriginalsVM }) {
  const titleId = `originals-${block.id}`
  return (
    <section className={styles.edit} aria-labelledby={titleId}>
      <div className={styles.editPhoto}>
        <OriginalPrint locale={locale} index={0} sizes="50vw" className={styles.editWall} />
      </div>
      <div className={styles.editPanel}>
        {block.label ? <Caps className={styles.label}>{block.label}</Caps> : null}
        <h2 id={titleId} className={styles.editTitle}>
          {block.title}
        </h2>
        <div className={styles.editArt}>
          <OriginalPrint locale={locale} index={1} sizes="20rem" className={styles.editTile} />
        </div>
        {block.body ? <p className={styles.editBody}>{block.body}</p> : null}
        {/* For now the owner's live gallery site, in a new tab (`../gallery-live`); the new
            gallery's home again once it launches. */}
        {block.linkLabel ? <CapsLink {...GALLERY_LIVE_LINK}>{block.linkLabel}</CapsLink> : null}
      </div>
    </section>
  )
}
