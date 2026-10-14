/**
 * The shop's home (4.3.b, 12.3; 19; Heritage 20): the hero lays the lead print across the walnut field
 * (`./hero`); below it "Shop by", the shop's real collections as picture tiles (`./shop-by`), the
 * streamed best sellers, how a print is made (`./process`), the trade offer and the bridge to the
 * originals in the gallery's stone, flush on the footer (`./sections`). A thin composition: every
 * word comes from the shop's lexicon.
 */
import { Button, SectionHead } from '../../../shared/ui'

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
      <section className={styles.section} aria-labelledby="home-featured">
        <SectionHead
          id="home-featured"
          title={t('home.shop.featuredTitle')}
          action={
            <Button variant="quiet" className={styles.headLink} href={href('browse', {}, locale)}>
              {t('home.shop.shopAll')}
            </Button>
          }
        />
        <FeaturedProducts locale={locale} t={t} />
      </section>
      <Process t={t} />
      <Trade locale={locale} href={href} t={t} />
      <Originals sisterHref={sisterHref} t={t} />
    </div>
  )
}
