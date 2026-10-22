/**
 * The stores page (13.2; the redesign of 2026-10-20, the handoff's `Stores`): the listing's
 * breadcrumb and head, the areas as a hairline sub-nav that sticks under the header (each links to
 * the area's title by its name, `#amed`, and the page glides there to just under the nav), then
 * each area — its name with the count beside it — and its stores three to a row on hairlines: the name in the
 * serif, the address and hours muted, a map link built from name and address only. The title, lede
 * and empty note are the page's `storeDirectory` block when it sets them, else the lexicon's.
 */
import type { SiteLocale } from '@engine/config/sites'
import { createHref, SITES } from '@engine/config/sites'

import type { StoreDirectoryVM } from '../../../server/shop/pages/blocks'
import type { AreaGroup, StoreVM } from '../../../server/shop/stores'
import { shopShellText } from '../shell/shell-messages'
import { CapsLink } from '../ui/caps-link'
import { Crumb } from '../ui/crumb'
import { AreaNav } from './area-nav'
import { storesText, type StoresText } from './copy'
import { storePhotoFor } from './store-photos'
import styles from './stores.module.css'

type Props = {
  readonly groups: readonly AreaGroup[]
  readonly locale: SiteLocale
  readonly block: StoreDirectoryVM
}

/** An area's anchor from its name: `/stores#amed`, `/stores#nusa-dua`; unique on the page. */
export function areaAnchors(names: readonly string[]): readonly string[] {
  const seen = new Map<string, number>()
  return names.map((name) => {
    const base =
      name
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'area'
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)
    return count === 1 ? base : `${base}-${count}`
  })
}

function StoreCard({ store, t }: { store: StoreVM; t: StoresText }) {
  const photo = storePhotoFor(`${store.name}|${store.address ?? ''}`)
  return (
    <li className={styles.store}>
      {/* One of the stores' photographs, not necessarily this store's own (`./store-photos`): the
          words beside it name the store, so the picture is decoration. */}
      <img
        className={styles.photo}
        src={photo.src}
        width={photo.width}
        height={photo.height}
        alt=""
        loading="lazy"
        decoding="async"
      />
      <div className={styles.storeBody}>
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
      </div>
    </li>
  )
}

export function StoresView({ groups, locale, block }: Props): React.ReactElement {
  const t = storesText(locale)
  const shell = shopShellText(locale)
  const total = groups.reduce((sum, group) => sum + group.stores.length, 0)
  const label = (group: AreaGroup) => group.area ?? t('stores.otherAreas')
  const anchors = areaAnchors(groups.map(label))
  const anchor = (index: number): string => anchors[index] ?? `area-${index}`
  return (
    <div className={styles.page}>
      <Crumb
        homeHref={createHref(SITES.shop)('home', {}, locale)}
        homeLabel={shell('shell.shop.home')}
        label={shell('shell.shop.breadcrumb')}
        steps={[{ label: block.title }]}
      />
      <div className={styles.head}>
        <h1 className={styles.title}>{block.title}</h1>
        {total > 0 && (
          <p className={styles.lede}>
            {block.lede
              ? block.lede.replaceAll('{count}', String(total))
              : t('stores.lede', { count: total })}
          </p>
        )}
      </div>
      {total === 0 ? (
        <p className={styles.empty}>{block.empty ?? t('stores.empty')}</p>
      ) : (
        <>
          <AreaNav
            label={t('stores.areas')}
            areas={groups.map((group, index) => ({ anchor: anchor(index), label: label(group) }))}
          />
          {groups.map((group, index) => (
            <section key={anchor(index)} className={styles.area} aria-labelledby={anchor(index)}>
              <div className={styles.areaHead}>
                <h2 id={anchor(index)} className={styles.areaTitle}>
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
