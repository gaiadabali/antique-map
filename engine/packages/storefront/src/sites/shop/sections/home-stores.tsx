/**
 * The home's "Stores" (TASKS.md 28.2; the owner's feedback of 2026-11-19): the flagship stores by
 * name and area, the regions and Nearby as links into the stores page, and "See all stores". The read is the
 * stores page's own public projection (`server/shop/stores`), streamed; with no listed store, or a
 * failed read, the section is left out.
 */
import { Suspense } from 'react'

import { createHref, SITES, type SiteLocale } from '@engine/config/sites'

import { storeDirectory, type StoreDirectoryData } from '../../../server/shop/stores'
import { storesText } from '../stores/copy'
import { areaAnchors, sectionLabels } from '../stores/stores-view'
import { CapsLink } from '../ui/caps-link'
import { sectionsText } from './copy'
import styles from './sections.module.css'

async function Stores({ locale }: { readonly locale: SiteLocale }) {
  let data: StoreDirectoryData | null = null
  try {
    data = await storeDirectory(locale)
  } catch {
    data = null
  }
  if (data === null || data.total === 0) return null
  const t = sectionsText(locale)
  const words = storesText(locale)
  const storesHref = createHref(SITES.shop)('stores', {}, locale)
  // The stores page's own anchors, so a region link (and Nearby) lands on its section.
  const anchors = areaAnchors(sectionLabels(data, words)).slice(data.flagships.length > 0 ? 1 : 0)
  const links = [
    ...data.regions.map((group) => words(`stores.region.${group.region}`)),
    ...(data.nearby.length > 0 ? [words('stores.nearby')] : []),
  ]
  return (
    <section className={styles.band} aria-labelledby="home-stores">
      <h2 id="home-stores" className={styles.bandTitle}>
        {t('homeStores.title')}
      </h2>
      <p className={styles.bandLede}>{t('homeStores.lede')}</p>
      {data.flagships.length > 0 ? (
        <ul className={styles.flagships}>
          {data.flagships.map((store) => (
            <li key={`${store.name}|${store.address ?? ''}`} className={styles.flagship}>
              <span className={styles.flagshipLabel}>{t('homeStores.flagship')}</span>
              <h3 className={styles.flagshipName}>{store.name}</h3>
              {(store.area ?? store.address) ? (
                <p className={styles.flagshipLine}>{store.area ?? store.address}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <ul className={styles.regions}>
        {links.map((label, index) => (
          <li key={label}>
            <a href={`${storesHref}#${anchors[index] ?? ''}`}>{label}</a>
          </li>
        ))}
      </ul>
      <div className={styles.more}>
        <CapsLink href={storesHref}>{t('homeStores.seeAll')}</CapsLink>
      </div>
    </section>
  )
}

export function HomeStores({ locale }: { readonly locale: SiteLocale }) {
  return (
    <Suspense fallback={null}>
      <Stores locale={locale} />
    </Suspense>
  )
}
