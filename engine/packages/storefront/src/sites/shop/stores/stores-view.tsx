/**
 * The stores page (13.2; the redesign of 2026-10-20, the handoff's `Stores`; TASKS.md 28.2, the
 * owner's feedback of 2026-11-19): the listing's breadcrumb and head, a hairline sub-nav that
 * sticks under the header (each link to its section's title, and the page glides there), then the
 * two flagship stores, then Lombok, Ubud, Amed and Canggu — each its first stores and "See all",
 * every one of them within a 30-minute drive — then every other store. A section with no store is
 * left out (no flagship set: no flagship section). Each store: the name in the serif, its area,
 * address and hours muted, a map link built from name and address only. The title, lede and empty
 * note are the page's `storeDirectory` block when it sets them, else the lexicon's.
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

/** How many stores a region shows before its "See all". */
export const REGION_PREVIEW = 3

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
  /** A region of the four: its preview, "See all" and the drive note. */
  readonly region: boolean
}

export function StoresView({ data, locale, block }: Props): React.ReactElement {
  const t = storesText(locale)
  const shell = shopShellText(locale)
  const labels = [
    ...(data.flagships.length > 0 ? [t('stores.flagships')] : []),
    ...data.regions.map((group) => t(`stores.region.${group.region}`)),
  ]
  const anchors = areaAnchors(labels)
  const sections: Section[] = [
    ...(data.flagships.length > 0
      ? [{ label: t('stores.flagships'), stores: data.flagships, region: false }]
      : []),
    ...data.regions.map((group) => ({
      label: t(`stores.region.${group.region}`),
      stores: group.stores,
      region: group.region !== 'other',
    })),
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
            const shown = section.region ? section.stores.slice(0, REGION_PREVIEW) : section.stores
            const rest = section.region ? section.stores.slice(REGION_PREVIEW) : []
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
                      {t('stores.seeAll', { region: section.label, count: section.stores.length })}
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
