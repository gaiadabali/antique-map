/**
 * The gallery's home (ticket 4.3.b), from the design team's drawing: hero with the film's poster
 * slot as a placeholder, the about band with its three signals, the streamed featured works, the
 * curator, the makers-and-places entry points and the enquiry band. Sections are plain
 * compositions of the shared UI components and the tokens in `home.module.css`; every word comes
 * from the gallery's lexicon. No price appears anywhere on this page.
 */
import { Button, Eyebrow, TextLink } from '../../../shared/ui'

import { FeaturedWorks } from './featured-works'
import styles from './home.module.css'
import type { HomeText } from './home-messages'

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
      <Hero locale={locale} href={href} t={t} />
      <About t={t} />
      <FeaturedWorks locale={locale} t={t} />
      <Curator t={t} />
      <EntryPoints locale={locale} href={href} t={t} />
      <Enquire locale={locale} href={href} t={t} />
    </div>
  )
}

function Hero({ locale, href, t }: Props) {
  return (
    <section className={`${styles.section} ${styles.hero}`}>
      <div className={styles.plate} style={{ aspectRatio: '16 / 9' }}>
        <span className={styles.plateInner}>{t('home.gallery.poster')}</span>
      </div>
      <div>
        <Eyebrow>{t('home.gallery.eyebrow')}</Eyebrow>
        <h1>{t('home.gallery.title')}</h1>
        <p className="site-lede">{t('home.gallery.lede')}</p>
        <div className={styles.trust}>
          <TrustCard
            title={t('home.gallery.trustCuratorTitle')}
            body={t('home.gallery.trustCuratorBody')}
          />
          <TrustCard
            title={t('home.gallery.trustOriginalsTitle')}
            body={t('home.gallery.trustOriginalsBody')}
          />
          <TrustCard
            title={t('home.gallery.trustMuseumsTitle')}
            body={t('home.gallery.trustMuseumsBody')}
          />
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" href={href('browse', {}, locale)}>
            {t('home.gallery.itemCta')}
          </Button>
          <Button variant="quiet" href={href('sellToUs', {}, locale)}>
            {t('home.gallery.sellToUsCta')}
          </Button>
        </div>
      </div>
    </section>
  )
}

function TrustCard({ title, body }: { title: string; body: string }) {
  return (
    <div className={styles.trustCard}>
      {/* A signal under the h1, not a section: a heading here would skip h2 (axe heading-order). */}
      <p className={styles.cardTitle}>{title}</p>
      <p className={styles.cardBody}>{body}</p>
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
