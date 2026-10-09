/**
 * The stores page (13.2): the shop's listed stores by area. An area row of anchors jumps to each
 * section; each store is a square card on the raised surface with its name, address, hours and a
 * map link built from name and address only.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { AreaGroup, StoreVM } from '../../../server/shop/stores'
import { SectionHead, TextLink } from '../../../shared/ui'
import { storesText, type StoresText } from './copy'
import styles from './stores.module.css'

type Props = { readonly groups: readonly AreaGroup[]; readonly locale: SiteLocale }

const anchor = (index: number): string => `area-${index}`

function StoreCard({ store, t }: { store: StoreVM; t: StoresText }) {
  return (
    <li className={styles.card}>
      <h3 className={styles.name}>{store.name}</h3>
      {store.address !== null && <p className={styles.address}>{store.address}</p>}
      {store.hours !== null && (
        <p className={styles.hours}>
          <span className={styles.hoursLabel}>{t('stores.hours')}</span>
          {store.hours}
        </p>
      )}
      <TextLink
        href={store.mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('stores.mapFor', { name: store.name })}
        className={styles.map}
      >
        {t('stores.map')}
      </TextLink>
    </li>
  )
}

export function StoresView({ groups, locale }: Props): React.ReactElement {
  const t = storesText(locale)
  const total = groups.reduce((sum, group) => sum + group.stores.length, 0)
  const label = (group: AreaGroup) => group.area ?? t('stores.otherAreas')
  return (
    <div className={styles.page}>
      <SectionHead
        level={1}
        eyebrow={t('stores.eyebrow')}
        title={t('stores.title')}
        lede={total > 0 ? t('stores.lede', { count: total }) : undefined}
      />
      {total === 0 ? (
        <p className={styles.empty}>{t('stores.empty')}</p>
      ) : (
        <>
          <nav className={styles.areas} aria-label={t('stores.areas')}>
            {groups.map((group, index) => (
              <a key={anchor(index)} href={`#${anchor(index)}`} className={styles.areaLink}>
                {label(group)}
              </a>
            ))}
          </nav>
          {groups.map((group, index) => (
            <section
              key={anchor(index)}
              id={anchor(index)}
              className={styles.area}
              aria-labelledby={`${anchor(index)}-title`}
            >
              <SectionHead
                id={`${anchor(index)}-title`}
                title={label(group)}
                lede={t('stores.count', { count: group.stores.length })}
              />
              <ul className={styles.grid}>
                {group.stores.map((store) => (
                  <StoreCard key={`${store.name}|${store.address ?? ''}`} store={store} t={t} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
