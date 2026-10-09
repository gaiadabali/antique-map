/**
 * The gallery's home (ticket 4.3.b, 14.2), from the design team's drawing: the hero with the lead
 * sheet on its mat (`./hero`), the about band with its three signals, the streamed featured works, the
 * curator, the makers-and-places entry points and the enquiry band. Sections are plain
 * compositions of the shared UI components and the tokens in `home.module.css`; every word comes
 * from the gallery's lexicon. No price appears anywhere on this page.
 */
import { siteOrigin } from '@engine/config/sites'

import { Button, Eyebrow, TextLink } from '../../../shared/ui'
import { siteHref } from '../../../shell/site'

import { FeaturedWorks } from './featured-works'
import { Hero } from './hero'
import styles from './home.module.css'
import type { HomeText } from './home-messages'

/** The sold archive is phase 5 (TASKS.md); these stand in until it ships (qa 4.qa, finding F4).
 * Never a price — the gallery never shows one, sold or not. */
const RECENTLY_PLACED = [
  { title: 'home.gallery.recentlyItem1Title', note: 'home.gallery.recentlyItem1Note' },
  { title: 'home.gallery.recentlyItem2Title', note: 'home.gallery.recentlyItem2Note' },
  { title: 'home.gallery.recentlyItem3Title', note: 'home.gallery.recentlyItem3Note' },
] as const

type Props = {
  readonly locale: 'en' | 'id'
  readonly href: (
    surface: 'browse' | 'maker' | 'place' | 'sellToUs',
    params: Record<string, never>,
    locale: 'en' | 'id',
  ) => string
  readonly t: HomeText
}

export function GalleryHome({ locale, href, t }: Props) {
  return (
    <div className={styles.wrap}>
      <Hero
        locale={locale}
        browseHref={href('browse', {}, locale)}
        sellToUsHref={href('sellToUs', {}, locale)}
        t={t}
      />
      <About t={t} />
      <FeaturedWorks locale={locale} t={t} />
      <Curator t={t} />
      <RecentlyPlaced t={t} />
      <LiveWithCollection locale={locale} t={t} />
      <EntryPoints locale={locale} href={href} t={t} />
      <Enquire locale={locale} href={href} t={t} />
    </div>
  )
}

function About({ t }: Pick<Props, 't'>) {
  return (
    <section className={styles.section}>
      <h2>{t('home.gallery.aboutEyebrow')}</h2>
      <div className={styles.aboutGrid}>
        <p className="site-lede">{t('home.gallery.aboutLead')}</p>
        <p className={styles.cardBody}>{t('home.gallery.aboutBody')}</p>
      </div>
      <div className={styles.signals}>
        <Signal label={t('home.gallery.signalTrade')} note={t('home.gallery.signalTradeNote')} />
        <Signal
          label={t('home.gallery.signalHandled')}
          note={t('home.gallery.signalHandledNote')}
        />
        <Signal label={t('home.gallery.signalHeld')} note={t('home.gallery.signalHeldNote')} />
      </div>
    </section>
  )
}

function Signal({ label, note }: { label: string; note: string }) {
  return (
    <div className={styles.signal}>
      <Eyebrow>{label}</Eyebrow>
      <p className={styles.signalNote}>{note}</p>
    </div>
  )
}

function Curator({ t }: Pick<Props, 't'>) {
  return (
    <section className={styles.section}>
      <div className={styles.curator}>
        <div className={styles.plate} style={{ aspectRatio: '5 / 4' }}>
          <span className={styles.plateInner}>{t('home.gallery.curatorPoster')}</span>
        </div>
        <div>
          <Eyebrow>{t('home.gallery.curatorEyebrow')}</Eyebrow>
          <h2>{t('home.gallery.curatorTitle')}</h2>
          <p className={styles.cardBody}>{t('home.gallery.curatorBody')}</p>
          <p className={styles.cardBody}>{t('home.gallery.curatorBody2')}</p>
        </div>
      </div>
    </section>
  )
}

function RecentlyPlaced({ t }: Pick<Props, 't'>) {
  return (
    <section className={styles.section}>
      <Eyebrow>{t('home.gallery.recentlyEyebrow')}</Eyebrow>
      <h2>{t('home.gallery.recentlyTitle')}</h2>
      <p className={styles.cardBody}>{t('home.gallery.recentlyBody')}</p>
      <div className={styles.three}>
        {RECENTLY_PLACED.map((item) => (
          <div key={item.title} className={styles.trustCard}>
            <p className={styles.cardTitle}>{t(item.title)}</p>
            <p className={styles.cardBody}>{t(item.note)}</p>
          </div>
        ))}
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
      <Eyebrow>{t('home.gallery.liveEyebrow')}</Eyebrow>
      <h2>{t('home.gallery.liveTitle')}</h2>
      <p className={styles.cardBody}>{t('home.gallery.liveBody')}</p>
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
      <h2>{t('home.gallery.makersTitle')}</h2>
      <p className={styles.cardBody}>{t('home.gallery.makersBody')}</p>
      <div className={styles.entry}>
        <a className={styles.entryCard} href={href('maker', {}, locale)}>
          <h3 className={styles.cardTitle}>{t('home.gallery.makersCta')}</h3>
        </a>
        <a className={styles.entryCard} href={href('place', {}, locale)}>
          <h3 className={styles.cardTitle}>{t('home.gallery.placesCta')}</h3>
        </a>
      </div>
    </section>
  )
}

function Enquire({ locale, href, t }: Props) {
  return (
    <section className={styles.section}>
      <Eyebrow>{t('home.gallery.enquireEyebrow')}</Eyebrow>
      <h2>{t('home.gallery.enquireTitle')}</h2>
      <p className={styles.cardBody}>{t('home.gallery.enquireBody')}</p>
      <div className={styles.actions}>
        <Button variant="primary" href={href('browse', {}, locale)}>
          {t('home.gallery.enquireCta')}
        </Button>
        <span className={styles.cardBody}>
          <TextLink href={href('sellToUs', {}, locale)}>{t('home.gallery.sellToUsCta')}</TextLink>
        </span>
      </div>
    </section>
  )
}
