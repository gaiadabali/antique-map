/**
 * The gallery's home (ticket 4.3.b, 14.2, 14.3): the hero with the lead sheet on its mat
 * (`./hero`), then bands that each open on a `SectionHead` — about, the collection, the curator,
 * recently placed, the bridge to the sister shop, makers and places, and the enquiry. The two
 * bands that show works live in `./works-bands`. Every word comes from the gallery's lexicon; no
 * price and no institution appear anywhere on this page.
 */
import type { SiteLocale } from '@engine/config/sites'
import { siteOrigin } from '@engine/config/sites'

import { Button, Mat, MatNote, SectionHead, TextLink } from '../../../shared/ui'
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
      <About t={t} />
      <CollectionBand locale={locale} browseHref={browseHref} t={t} />
      <Curator t={t} />
      <RecentlyPlacedBand locale={locale} t={t} />
      <LiveWithCollection locale={locale} t={t} />
      <EntryPoints locale={locale} href={href} t={t} />
      <Enquire locale={locale} href={href} t={t} />
    </div>
  )
}

function About({ t }: Pick<Props, 't'>) {
  return (
    <section className={styles.section}>
      <SectionHead
        eyebrow={t('home.gallery.aboutEyebrow')}
        title={t('home.gallery.aboutTitle')}
        lede={t('home.gallery.aboutLead')}
      />
      <p className={styles.body}>{t('home.gallery.aboutBody')}</p>
    </section>
  )
}

function Curator({ t }: Pick<Props, 't'>) {
  return (
    <section className={`${styles.section} ${styles.curator}`}>
      {/* The portrait is not yet supplied: an empty window that says so. */}
      <Mat ratio={5 / 4} fit="contain">
        <MatNote>{t('home.gallery.curatorPoster')}</MatNote>
      </Mat>
      <div>
        <SectionHead
          eyebrow={t('home.gallery.curatorEyebrow')}
          title={t('home.gallery.curatorTitle')}
        />
        <p className={styles.body}>{t('home.gallery.curatorBody')}</p>
        <p className={styles.body}>{t('home.gallery.curatorBody2')}</p>
      </div>
    </section>
  )
}

function LiveWithCollection({ locale, t }: Pick<Props, 'locale' | 't'>) {
  const sister = siteHref('shop')('home', {}, locale)
  const origin = siteOrigin('shop')
  const sisterUrl = origin === null ? sister : `${origin}${sister}`
  return (
    <section className={styles.section}>
      <SectionHead
        eyebrow={t('home.gallery.liveEyebrow')}
        title={t('home.gallery.liveTitle')}
        lede={t('home.gallery.liveBody')}
      />
      <div className={styles.actions}>
        {/* The bridge to the shop, which lives on its own host — so absolute (site-shell's rule). */}
        <Button variant="quiet" href={sisterUrl}>
          {t('home.gallery.liveCta')}
        </Button>
      </div>
    </section>
  )
}

function EntryPoints({ locale, href, t }: Props) {
  return (
    <section className={styles.section}>
      <SectionHead title={t('home.gallery.makersTitle')} lede={t('home.gallery.makersBody')} />
      <div className={styles.panels}>
        <a className={styles.panel} href={href('maker', {}, locale)}>
          <span className={styles.panelTitle}>{t('home.gallery.makersCta')}</span>
          <span className={styles.panelLine}>{t('home.gallery.makersLine')}</span>
        </a>
        <a className={styles.panel} href={href('place', {}, locale)}>
          <span className={styles.panelTitle}>{t('home.gallery.placesCta')}</span>
          <span className={styles.panelLine}>{t('home.gallery.placesLine')}</span>
        </a>
      </div>
    </section>
  )
}

function Enquire({ locale, href, t }: Props) {
  return (
    <section className={styles.section}>
      <SectionHead
        eyebrow={t('home.gallery.enquireEyebrow')}
        title={t('home.gallery.enquireTitle')}
        lede={t('home.gallery.enquireBody')}
      />
      <div className={styles.actions}>
        <Button variant="primary" href={href('browse', {}, locale)}>
          {t('home.gallery.enquireCta')}
        </Button>
        <TextLink href={href('sellToUs', {}, locale)}>{t('home.gallery.sellToUsCta')}</TextLink>
      </div>
    </section>
  )
}
