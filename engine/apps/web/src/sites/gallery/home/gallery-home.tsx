/**
 * The gallery's home (4.3.b, 14.2, 14.3; Outline Colour 17.2). The hero lays the lead sheet across
 * a verdigris field (`./hero`); below it the bands follow the gallery's pigment order on full-width
 * fields — the newest works on the paper, the house and its curator on the verdigris tint, the
 * recently placed on the paper, the bridge to the sister shop in the shop's gamboge, makers and places as an index, and
 * the enquiry set large to close. No band shows an empty picture window: the curator's portrait is
 * not supplied yet, so his band is type. Every word comes from the gallery's lexicon; no price and
 * no institution appear anywhere on this page.
 */
import type { SiteLocale } from '@engine/config/sites'
import { siteOrigin } from '@engine/config/sites'

import { Band, Button, SectionHead } from '../../../shared/ui'
import { siteHref } from '../../../shell/site'

import { Hero } from './hero'
import styles from './home.module.css'
import type { HomeText } from './home-messages'
import { CollectionBand, RecentlyPlacedBand } from './works-bands'

type Props = {
  readonly locale: SiteLocale
  readonly href: (
    surface: 'browse' | 'maker' | 'place' | 'sellToUs',
    params: Record<string, never>,
    locale: SiteLocale,
  ) => string
  readonly t: HomeText
}

export function GalleryHome({ locale, href, t }: Props) {
  const browseHref = href('browse', {}, locale)
  return (
    <div className={styles.wrap}>
      <Hero
        locale={locale}
        browseHref={browseHref}
        sellToUsHref={href('sellToUs', {}, locale)}
        t={t}
      />
      <CollectionBand locale={locale} browseHref={browseHref} t={t} />
      <House t={t} />
      <RecentlyPlacedBand locale={locale} t={t} />
      <LiveWithCollection locale={locale} t={t} />
      <EntryPoints locale={locale} href={href} t={t} />
      <Enquire locale={locale} href={href} t={t} />
    </div>
  )
}

/** About the house and its curator, side by side on the verdigris tint: a letter, not a card. */
function House({ t }: Pick<Props, 't'>) {
  return (
    <Band pigment={1} strength="tint" aria-labelledby="home-about">
      <div className={styles.house}>
        <div>
          <SectionHead
            id="home-about"
            title={t('home.gallery.aboutTitle')}
            lede={t('home.gallery.aboutLead')}
          />
          <p className={styles.body}>{t('home.gallery.aboutBody')}</p>
        </div>
        <div className={styles.curator}>
          <h3 className={styles.curatorName}>{t('home.gallery.curatorTitle')}</h3>
          <p className={styles.curatorRole}>{t('home.gallery.curatorEyebrow')}</p>
          <p className={styles.body}>{t('home.gallery.curatorBody')}</p>
          <p className={styles.body}>{t('home.gallery.curatorBody2')}</p>
        </div>
      </div>
    </Band>
  )
}

function LiveWithCollection({ locale, t }: Pick<Props, 'locale' | 't'>) {
  const sister = siteHref('shop')('home', {}, locale)
  const origin = siteOrigin('shop')
  const sisterUrl = origin === null ? sister : `${origin}${sister}`
  return (
    // The bridge to the sister shop wears the shop's own colour (gamboge): colour names the site.
    <Band pigment={2} strength="wash" aria-labelledby="home-live">
      <div className={styles.bridge}>
        <SectionHead
          id="home-live"
          title={t('home.gallery.liveTitle')}
          lede={t('home.gallery.liveBody')}
        />
        {/* The bridge to the shop, which lives on its own host — so absolute (site-shell's rule). */}
        <Button variant="secondary" href={sisterUrl}>
          {t('home.gallery.liveCta')}
        </Button>
      </div>
    </Band>
  )
}

/** Makers and places as a two-entry index: the words set large on a rule, no boxes. */
function EntryPoints({ locale, href, t }: Props) {
  return (
    <section className={styles.section} aria-labelledby="home-index">
      <SectionHead
        id="home-index"
        title={t('home.gallery.makersTitle')}
        lede={t('home.gallery.makersBody')}
      />
      <ul className={styles.index}>
        <li>
          <a className={styles.entry} href={href('maker', {}, locale)}>
            <span className={styles.entryTitle}>{t('home.gallery.makersCta')}</span>
            <span className={styles.entryLine}>{t('home.gallery.makersLine')}</span>
          </a>
        </li>
        <li>
          <a className={styles.entry} href={href('place', {}, locale)}>
            <span className={styles.entryTitle}>{t('home.gallery.placesCta')}</span>
            <span className={styles.entryLine}>{t('home.gallery.placesLine')}</span>
          </a>
        </li>
      </ul>
    </section>
  )
}

/** The close: the gallery's one promise set at display size, Enquire in madder. */
function Enquire({ locale, href, t }: Props) {
  return (
    <section className={styles.close} aria-labelledby="home-enquire">
      <h2 id="home-enquire" className={styles.closeTitle}>
        {t('home.gallery.enquireTitle')}
      </h2>
      <div className={styles.closeBody}>
        <p className={styles.closeLede}>{t('home.gallery.enquireBody')}</p>
        <div className={styles.actions}>
          <Button variant="primary" href={href('browse', {}, locale)}>
            {t('home.gallery.enquireCta')}
          </Button>
          <Button variant="quiet" href={href('sellToUs', {}, locale)}>
            {t('home.gallery.sellToUsCta')}
          </Button>
        </div>
      </div>
    </section>
  )
}
