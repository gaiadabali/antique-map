/**
 * The shop's home (ticket 4.3.b, luxury pass 12.3): the hero (`./hero`), the "shop by" links, the
 * streamed best sellers, the sets, the process, the trade band and the originals band. A thin
 * composition: the sections below the best sellers live in `./sections`, and every word comes
 * from the shop's lexicon.
 */
import { Button, Eyebrow, SectionHead } from '../../../shared/ui'

import { FeaturedProducts } from './featured-products'
import { Hero } from './hero'
import styles from './home.module.css'
import { Originals, Process, Sets, Trade, type SectionProps } from './sections'

/** Browse has no island or room facet yet (qa 4.qa, finding F4); every link goes to the shop
 * until one does — placeholder until the owner's content. */
const ISLAND_CHIPS = [
  'home.shop.chipIslandBali',
  'home.shop.chipIslandJava',
  'home.shop.chipIslandSumatra',
  'home.shop.chipIslandLombok',
] as const
const ROOM_CHIPS = [
  'home.shop.chipRoomLivingRoom',
  'home.shop.chipRoomBedroom',
  'home.shop.chipRoomOffice',
  'home.shop.chipRoomEntryway',
] as const

type Props = SectionProps & {
  /** The gallery's home on its own host — the sister-site bridge is absolute (site-shell's rule). */
  readonly sisterHref: string
}

export function ShopHome({ locale, href, sisterHref, t }: Props) {
  return (
    <div className={styles.wrap}>
      <Hero locale={locale} shopHref={href('browse', {}, locale)} t={t} />
      <Chips href={href} locale={locale} t={t} />
      <section className={styles.section}>
        <SectionHead
          eyebrow={t('home.shop.featuredEyebrow')}
          title={t('home.shop.featuredTitle')}
          action={
            <Button variant="quiet" href={href('browse', {}, locale)}>
              {t('home.shop.shopAll')}
            </Button>
          }
        />
        <FeaturedProducts locale={locale} t={t} />
      </section>
      <Sets href={href} locale={locale} t={t} />
      <Process t={t} />
      <Trade locale={locale} href={href} t={t} />
      <Originals sisterHref={sisterHref} t={t} />
    </div>
  )
}

function Chips({ locale, href, t }: SectionProps) {
  const target = href('browse', {}, locale)
  return (
    <section className={styles.chips}>
      <h2 className={styles.railHeading}>
        <Eyebrow>{t('home.shop.chipsEyebrow')}</Eyebrow>
      </h2>
      {[ISLAND_CHIPS, ROOM_CHIPS].map((group, at) => (
        <ul key={at} className={styles.chipsRow}>
          {group.map((key) => (
            <li key={key}>
              <a className={styles.chip} href={target}>
                {t(key)}
              </a>
            </li>
          ))}
        </ul>
      ))}
    </section>
  )
}
