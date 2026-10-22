/**
 * The partnership page's sections as blocks (the redesign of 2026-10-20, the handoff's
 * `Partnership`): a hero of two halves — the words on the warm left, a framed print on the grey
 * right — a warm band of facts, and each offer as a story with its terms as a ruled list beside two
 * framed prints, the warm ones alternating. The words are the page's blocks (the CMS, or the
 * lexicon's defaults); the prints are the shop's own, chosen by position.
 */
import type { FactStripVM, OfferVM, PageHeroVM } from '../../../server/shop/pages/blocks'
import { Button } from '../../../shared/ui'
import { linkProps } from '../blocks/link-props'
import { FeaturedPrint } from '../home/featured-print'
import { Caps, CapsLink } from '../ui/caps-link'
import styles from './partnership-page.module.css'

type Locale = { readonly locale: 'en' | 'id' }

/** The page's hero: its h1 and the two ways in, beside a framed print. */
export function PageHero({ locale, block }: Locale & { readonly block: PageHeroVM }) {
  const titleId = `hero-${block.id}`
  return (
    <section className={styles.hero} aria-labelledby={titleId}>
      <div className={styles.heroWords}>
        <div className={styles.heroBlock}>
          {block.eyebrow ? <Caps className={styles.eyebrow}>{block.eyebrow}</Caps> : null}
          <h1 id={titleId} className={styles.heroTitle}>
            {block.title}
          </h1>
          {block.lede ? <p className={styles.heroLede}>{block.lede}</p> : null}
          {block.primary || block.secondary ? (
            <div className={styles.heroActions}>
              {block.primary ? (
                <Button variant="primary" size="small" {...linkProps(block.primary)}>
                  {block.primary.label}
                </Button>
              ) : null}
              {block.secondary ? (
                <CapsLink {...linkProps(block.secondary)}>{block.secondary.label}</CapsLink>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className={styles.heroWall}>
        <FeaturedPrint locale={locale} index={4} sizes="45vw" className={styles.heroTile} />
      </div>
    </section>
  )
}

/** The warm band of short facts. */
export function FactStrip({ block }: { readonly block: FactStripVM }) {
  return (
    <ul className={styles.trust}>
      {block.facts.map((fact) => (
        <li key={fact}>
          <Caps>{fact}</Caps>
        </li>
      ))}
    </ul>
  )
}

/**
 * One offer: its words and terms beside two framed prints. `ordinal` is its place among the page's
 * offers, so each draws the next two prints rather than the same pair.
 */
export function Offer({
  locale,
  block,
  ordinal,
}: Locale & { readonly block: OfferVM; readonly ordinal: number }) {
  const titleId = `offer-${block.id}`
  return (
    <section
      id={block.anchor ?? undefined}
      className={styles.story}
      data-warm={block.warm || undefined}
      aria-labelledby={titleId}
    >
      <div className={styles.storyText}>
        {block.eyebrow ? <Caps className={styles.eyebrow}>{block.eyebrow}</Caps> : null}
        <h2 id={titleId} className={styles.storyTitle}>
          {block.title}
        </h2>
        {block.body ? <p className={styles.storyBody}>{block.body}</p> : null}
        {block.terms.length > 0 ? (
          <dl className={styles.specs}>
            {block.terms.map((term) => (
              <div className={styles.spec} key={term.label}>
                <dt>{term.label}</dt>
                <dd>{term.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {block.link ? <CapsLink {...linkProps(block.link)}>{block.link.label}</CapsLink> : null}
      </div>
      <div className={styles.storyPhotos} role="group" aria-label={block.title} tabIndex={0}>
        <FeaturedPrint
          locale={locale}
          index={ordinal * 2}
          sizes="(max-width: 56.25rem) 80vw, 33vw"
          className={styles.photo}
        />
        <FeaturedPrint
          locale={locale}
          index={ordinal * 2 + 1}
          sizes="(max-width: 56.25rem) 80vw, 33vw"
          className={styles.photo}
        />
      </div>
    </section>
  )
}
