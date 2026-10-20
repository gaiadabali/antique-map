/**
 * The shop's home (the redesign of 2026-10-20, the design handoff's `Home - Old East Indies`): the
 * hero's two halves under the clear header (`./hero`); "Shop by", the real collections as a rail
 * (`./shop-by`); "Begin with these", the featured products as a rail; how a print is made, a warm
 * band (`./process`); the trade story and the bridge to the originals (`./sections`). A thin
 * composition: every word comes from the shop's lexicon.
 */
import { FeaturedProducts } from './featured-products'
import { Hero } from './hero'
import styles from './home.module.css'
import { Process } from './process'
import { Originals, Trade, type SectionProps } from './sections'
import { ShopBy } from './shop-by'

type Props = SectionProps & {
  /** The gallery's home on its own host — the sister-site bridge is absolute (site-shell's rule). */
  readonly sisterHref: string
}

export function ShopHome({ locale, href, sisterHref, t }: Props) {
  return (
    <div className={styles.wrap}>
      <Hero locale={locale} shopHref={href('browse', {}, locale)} t={t} />
      <ShopBy locale={locale} t={t} allHref={href('collection', {}, locale)} />
      <FeaturedProducts locale={locale} t={t} allHref={href('browse', {}, locale)} />
      <Process t={t} />
      <Trade locale={locale} href={href} t={t} />
      <Originals locale={locale} sisterHref={sisterHref} t={t} />
    </div>
  )
}
