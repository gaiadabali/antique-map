/**
 * The stores page (13.2; the redesign of 2026-10-20, the handoff's `Stores`; TASKS.md 28.2, the
 * owner's feedback of 2026-11-19): the listing's breadcrumb and head, a hairline sub-nav that
 * sticks under the header (each link to its section's title, and the page glides there), then the
 * two flagship stores, then Lombok, Ubud, Amed and Canggu — one store each (the order of
 * 2026-11-25), within a 30-minute drive — then every other store as Nearby, its first and "See
 * all", so a long remainder never stretches the page, above all on a phone. A section with no
 * store is left out (no flagship set: no flagship section). Each store: the name in the serif, its
 * area, the owner's one address and the hours muted, and the owner's map link
 * (`server/shop/stores/owner-location`). The title, lede and empty note are the page's
 * `storeDirectory` block when it sets them, else the lexicon's.
 */
import type { SiteLocale } from '@engine/config/sites'
import { createHref, SITES } from '@engine/config/sites'

import type { StoreDirectoryVM } from '../../../server/shop/pages/blocks'
import type { StoreDirectoryData, StoreVM } from '../../../server/shop/stores'
import { shopShellText } from '../shell/shell-messages'
import { CapsLink } from '../ui/caps-link'
import { Crumb } from '../ui/crumb'
import { AreaNav } from '../ui/lazy-islands'
import { storesText, type StoresText } from './copy'
import { storePhotoFor } from './store-photos'
import styles from './stores.module.css'

type Props = {
  readonly data: StoreDirectoryData
  readonly locale: SiteLocale
  readonly block: StoreDirectoryVM
}

/** How many stores Nearby shows before its "See all". */
export const NEARBY_PREVIEW = 3

type Store = StoreVM & { readonly area: string | null }

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

function StoreCard({ store, t }: { store: Store; t: StoresText }) {
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
        {store.area !== null && <p className={styles.line}>{store.area}</p>}
        <p className={styles.line}>{t('stores.address')}</p>
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

function Cards({ stores, t }: { stores: readonly Store[]; t: StoresText }) {
  return (
    <ul className={styles.grid}>
      {stores.map((store) => (
        <StoreCard key={`${store.name}|${store.address ?? ''}`} store={store} t={t} />
      ))}
    </ul>
  )
}

type Section = {
  readonly anchor: string
  readonly label: string
  readonly stores: readonly Store[]
  /** A region of the four: the drive note. */
  readonly region: boolean
  /** Its first stores, the rest behind "See all": Nearby. */
  readonly folds: boolean
}

/** The page's section titles in order — the stores page and the home's links share them. */
export function sectionLabels(data: StoreDirectoryData, t: StoresText): readonly string[] {
  return [
    ...(data.flagships.length > 0 ? [t('stores.flagships')] : []),
    ...data.regions.map((group) => t(`stores.region.${group.region}`)),
    ...(data.nearby.length > 0 ? [t('stores.nearby')] : []),
  ]
}

export function StoresView({ data, locale, block }: Props): React.ReactElement {
  const t = storesText(locale)
  const shell = shopShellText(locale)
  const anchors = areaAnchors(sectionLabels(data, t))
  const sections: Section[] = [
    ...(data.flagships.length > 0
      ? [{ label: t('stores.flagships'), stores: data.flagships, region: false, folds: false }]
      : []),
    ...data.regions.map((group) => ({
      label: t(`stores.region.${group.region}`),
      stores: group.stores,
      region: true,
      folds: false,
    })),
    ...(data.nearby.length > 0
      ? [{ label: t('stores.nearby'), stores: data.nearby, region: false, folds: true }]
      : []),
  ].map((section, index) => ({ ...section, anchor: anchors[index] ?? `area-${index}` }))
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
        {data.total > 0 && (
          <p className={styles.lede}>
            {block.lede
              ? block.lede.replaceAll('{count}', String(data.total))
              : t('stores.lede', { count: data.total })}
          </p>
        )}
      </div>
      {data.total === 0 ? (
        <p className={styles.empty}>{block.empty ?? t('stores.empty')}</p>
      ) : (
        <>
          <AreaNav
            label={t('stores.areas')}
            areas={sections.map(({ anchor, label }) => ({ anchor, label }))}
          />
          {sections.map((section) => {
            const shown = section.folds ? section.stores.slice(0, NEARBY_PREVIEW) : section.stores
            const rest = section.folds ? section.stores.slice(NEARBY_PREVIEW) : []
            return (
              <section
                key={section.anchor}
                className={styles.area}
                aria-labelledby={section.anchor}
              >
                <div className={styles.areaHead}>
                  <h2 id={section.anchor} className={styles.areaTitle}>
                    {section.label}
                  </h2>
                  <span className={styles.count}>
                    {t('stores.count', { count: section.stores.length })}
                  </span>
                </div>
                {section.region ? <p className={styles.drive}>{t('stores.drive')}</p> : null}
                <Cards stores={shown} t={t} />
                {rest.length > 0 ? (
                  <details className={styles.more}>
                    <summary className={styles.seeAll}>
                      {t('stores.seeAllNearby', { count: section.stores.length })}
                    </summary>
                    <Cards stores={rest} t={t} />
                  </details>
                ) : null}
              </section>
            )
          })}
        </>
      )}
    </div>
  )
}
