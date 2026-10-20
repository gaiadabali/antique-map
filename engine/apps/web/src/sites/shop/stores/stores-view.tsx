/**
 * The stores page (13.2; the redesign of 2026-10-20, the handoff's `Stores`): the listing's
 * breadcrumb and head, the areas as a hairline sub-nav that sticks under the header, then each area
 * — its name with the count beside it — and its stores three to a row on hairlines: the name in the
 * serif, the address and hours muted, a map link built from name and address only.
 */
import type { SiteLocale } from '@engine/config/sites'
import { createHref, SITES } from '@engine/config/sites'

import type { AreaGroup, StoreVM } from '../../../server/shop/stores'
import { shopShellText } from '../shell/shell-messages'
import { CapsLink } from '../ui/caps-link'
import { Crumb } from '../ui/crumb'
import { storesText, type StoresText } from './copy'
import styles from './stores.module.css'

type Props = { readonly groups: readonly AreaGroup[]; readonly locale: SiteLocale }

const anchor = (index: number): string => `area-${index}`

function StoreCard({ store, t }: { store: StoreVM; t: StoresText }) {
  return (
    <li className={styles.store}>
      <h3 className={styles.name}>{store.name}</h3>
      {store.address !== null && <p className={styles.line}>{store.address}</p>}
      {store.hours !== null && (
        <p className={styles.line}>
          <span className={styles.hoursLabel}>{t('stores.hours')}</span> {store.hours}
        </p>
      )}
      <CapsLink
        href={store.mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('stores.mapFor', { name: store.name })}
      >
        {t('stores.map')}
      </CapsLink>
    </li>
  )
}

export function StoresView({ groups, locale }: Props): React.ReactElement {
  const t = storesText(locale)
  const shell = shopShellText(locale)
  const total = groups.reduce((sum, group) => sum + group.stores.length, 0)
  const label = (group: AreaGroup) => group.area ?? t('stores.otherAreas')
  return (
    <div className={styles.page}>
      <Crumb
        homeHref={createHref(SITES.shop)('home', {}, locale)}
        homeLabel={shell('shell.shop.home')}
        label={shell('shell.shop.breadcrumb')}
        steps={[{ label: t('stores.title') }]}
      />
      <div className={styles.head}>
        <h1 className={styles.title}>{t('stores.title')}</h1>
        {total > 0 && <p className={styles.lede}>{t('stores.lede', { count: total })}</p>}
      </div>
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
              <div className={styles.areaHead}>
                <h2 id={`${anchor(index)}-title`} className={styles.areaTitle}>
                  {label(group)}
                </h2>
                <span className={styles.count}>
                  {t('stores.count', { count: group.stores.length })}
                </span>
              </div>
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
