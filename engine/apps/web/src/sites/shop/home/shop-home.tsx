/**
 * The shop's home (ticket 4.3.b), from the design team's drawing: hero with two print slots, the
 * streamed best sellers, the process, the trade band linking the partnership page and the
 * originals band bridging to the gallery. Sections are compositions of the shared UI components
 * and the tokens in `home.module.css`; every word comes from the shop's lexicon.
 */
import { Button, Eyebrow } from '../../../shared/ui'

import { FeaturedProducts } from './featured-products'
import styles from './home.module.css'
import type { HomeText } from './home-messages'

/** Browse has no island or room facet yet (qa 4.qa, finding F4); every chip links to the shop
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

/** "Sets that hang together" needs the collections surface (TASKS.md, phase 6); these three
 * stand in until it ships, placeholder until the owner's content. */
const SETS = [
  { title: 'home.shop.set1Title', body: 'home.shop.set1Body' },
  { title: 'home.shop.set2Title', body: 'home.shop.set2Body' },
  { title: 'home.shop.set3Title', body: 'home.shop.set3Body' },
] as const

type Props = {
  readonly locale: 'en' | 'id'
  readonly href: (
    surface: 'browse' | 'partnership' | 'collection',
    params: Record<string, never>,
    locale: 'en' | 'id',
  ) => string
  /** The gallery's home on its own host — the sister-site bridge is absolute (site-shell's rule). */
  readonly sisterHref: string
  readonly t: HomeText
}

export function ShopHome({ locale, href, sisterHref, t }: Props) {
  return (
    <div className={styles.wrap}>
      <Hero locale={locale} href={href} t={t} />
      <Chips href={href} locale={locale} t={t} />
      <section className={styles.section}>
        <div className={styles.rail}>
          {/* The section's heading, so the product cards' h3 follow an h2 (axe heading-order). */}
          <h2 className={styles.railHeading}>
            <Eyebrow>{t('home.shop.featuredEyebrow')}</Eyebrow>
          </h2>
          <div>
            <FeaturedProducts locale={locale} t={t} />
            <div className={styles.actions}>
              <Button variant="quiet" href={href('browse', {}, locale)}>
                {t('home.shop.shopAll')}
              </Button>
            </div>
          </div>
        </div>
      </section>
      <Sets href={href} locale={locale} t={t} />
      <Process t={t} />
      <Trade locale={locale} href={href} t={t} />
      <Originals sisterHref={sisterHref} t={t} />
    </div>
  )
}

function Chips({ locale, href, t }: Pick<Props, 'locale' | 'href' | 't'>) {
  return (
    <section className={styles.section}>
      <h2 className={styles.railHeading}>
        <Eyebrow>{t('home.shop.chipsEyebrow')}</Eyebrow>
      </h2>
      <div className={styles.chipsRow}>
        {ISLAND_CHIPS.map((key) => (
          <a key={key} className={styles.chip} href={href('browse', {}, locale)}>
            {t(key)}
          </a>
        ))}
      </div>
      <div className={styles.chipsRow}>
        {ROOM_CHIPS.map((key) => (
          <a key={key} className={styles.chip} href={href('browse', {}, locale)}>
            {t(key)}
          </a>
        ))}
      </div>
    </section>
  )
}

function Sets({ locale, href, t }: Pick<Props, 'locale' | 'href' | 't'>) {
  return (
    <section className={styles.section}>
      <Eyebrow>{t('home.shop.setsEyebrow')}</Eyebrow>
      <h2>{t('home.shop.setsTitle')}</h2>
      <p className={styles.cardBody}>{t('home.shop.setsBody')}</p>
      <div className={styles.four}>
        {SETS.map((set) => (
          <div key={set.title} className={styles.setCard}>
            <div className={styles.plate} style={{ aspectRatio: '4 / 5' }}>
              <span className={styles.plateInner}>{t(set.title)}</span>
            </div>
            <p className={styles.cardTitle}>{t(set.title)}</p>
            <p className={styles.cardBody}>{t(set.body)}</p>
          </div>
        ))}
      </div>
      <div className={styles.actions}>
        <Button variant="quiet" href={href('collection', {}, locale)}>
          {t('home.shop.setsCta')}
        </Button>
      </div>
    </section>
  )
}

function Hero({ locale, href, t }: Pick<Props, 'locale' | 'href' | 't'>) {
  return (
    <section className={`${styles.section} ${styles.hero}`}>
      <div className={styles.heroCopy}>
        <Eyebrow>{t('home.shop.eyebrow')}</Eyebrow>
        <h1>{t('home.shop.title')}</h1>
        <p className="site-lede">{t('home.shop.lede')}</p>
        <div className={styles.actions}>
          <Button variant="primary" href={href('browse', {}, locale)}>
            {t('home.shop.ctaShop')}
          </Button>
          <Button variant="quiet" href="#process">
            {t('home.shop.ctaProcess')}
          </Button>
        </div>
      </div>
      <div>
        <div className={styles.plate} style={{ aspectRatio: '4 / 5' }}>
          <span className={styles.plateInner}>{t('home.shop.heroA')}</span>
        </div>
      </div>
      <div className={styles.heroThird}>
        <div className={styles.plate} style={{ aspectRatio: '3 / 4' }}>
          <span className={styles.plateInner}>{t('home.shop.heroB')}</span>
        </div>
      </div>
    </section>
  )
}

function Process({ t }: Pick<Props, 't'>) {
  return (
    <section className={styles.section} id="process">
      <div className={styles.process}>
        <div className={styles.plate} style={{ aspectRatio: '5 / 4' }}>
          <span className={styles.plateInner}>{t('home.shop.posterWorkshop')}</span>
        </div>
        <div>
          <Eyebrow>{t('home.shop.processEyebrow')}</Eyebrow>
          <h2>{t('home.shop.processTitle')}</h2>
          <div className={styles.processStep}>
            <span className={styles.num}>{'01/'}</span>
            <p className={styles.stepTitle}>{t('home.shop.processStep1Title')}</p>
            <p className={styles.cardBody}>{t('home.shop.processStep1Body')}</p>
          </div>
          <div className={styles.processStep}>
            <span className={styles.num}>{'02/'}</span>
            <p className={styles.stepTitle}>{t('home.shop.processStep2Title')}</p>
            <p className={styles.cardBody}>{t('home.shop.processStep2Body')}</p>
          </div>
          <div className={styles.processStep}>
            <span className={styles.num}>{'03/'}</span>
            <p className={styles.stepTitle}>{t('home.shop.processStep3Title')}</p>
            <p className={styles.cardBody}>{t('home.shop.processStep3Body')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Trade({ locale, href, t }: Pick<Props, 'locale' | 'href' | 't'>) {
  return (
    <section className={`${styles.band} ${styles.bandDark}`}>
      <div className={styles.wrap}>
        <div className={styles.trade}>
          <div>
            <Eyebrow>{t('home.shop.tradeEyebrow')}</Eyebrow>
            <h2>{t('home.shop.tradeTitle')}</h2>
            <p className={styles.cardBody}>{t('home.shop.tradeBody')}</p>
            <div className={styles.actions}>
              <Button variant="secondary" href={href('partnership', {}, locale)}>
                {t('home.shop.tradeCta')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Originals({ sisterHref, t }: Pick<Props, 'sisterHref' | 't'>) {
  return (
    <section className={`${styles.band} ${styles.bandTint}`}>
      <div className={styles.wrap}>
        <div className={styles.originals}>
          <div>
            <Eyebrow>{t('home.shop.originalsEyebrow')}</Eyebrow>
            <h2>{t('home.shop.originalsTitle')}</h2>
            <p className={styles.cardBody}>{t('home.shop.originalsBody')}</p>
            <div className={styles.actions}>
              {/* The bridge to the gallery, which lives on its own host — so absolute, and in
                  the visitor's locale, never hardcoded. */}
              <Button variant="quiet" href={sisterHref}>
                {t('home.shop.originalsCta')}
              </Button>
            </div>
          </div>
          <div className={styles.plate} style={{ aspectRatio: '5 / 4' }}>
            <span className={styles.plateInner}>{t('home.shop.posterOriginal')}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
