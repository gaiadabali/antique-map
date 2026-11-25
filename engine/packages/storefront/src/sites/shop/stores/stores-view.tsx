/**
 * The stores page (13.2; the redesign of 2026-10-20, the handoff's `Stores`; TASKS.md 28.2, the
 * owner's feedback of 2026-11-19): the listing's breadcrumb and head, a hairline sub-nav that
 * sticks under the header (each link to its section's title, and the page glides there), then the
 * two flagship stores, then Lombok, Ubud, Amed and Canggu — one store each (the order of
 * 2026-11-25) — then every other store as Nearby, its first and "See all", so a long remainder never stretches the page, above all on a phone. A section with no
 * store is left out (no flagship set: no flagship section). Each store: the name in the serif, its
 * area, the owner's one address and the hours muted, and the owner's map link
 * (`server/shop/stores/owner-location`). The title, lede and empty note are the page's
 * `storeDirectory` block when it sets them, else the lexicon's.
 */
import type { SiteLocale } from '@engine/config/sites'
import { createHref, SITES } from '@engine/config/sites'

import type { StoreDirectoryVM } from '../../../server/shop/pages/blocks'
import type { StoreDirectoryData, StoreRegionKey, StoreVM } from '../../../server/shop/stores'
import { shopShellText } from '../shell/shell-messages'
import { CapsLink } from '../ui/caps-link'
import { Crumb } from '../ui/crumb'
import { AreaNav, NearbyStores } from '../ui/lazy-islands'
import { storesText, type StoresText } from './copy'
import type { NearbyWords } from './nearby'
import { StoreCard, type StoreCardData, type StoreCardWords } from './store-card'
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

/**
 * A store as its card draws it: the photo chosen here, from its name and address; the area line
 * for Nearby only (`./store-card`).
 */
function cardOf(store: Store, withPlace = false): StoreCardData {
  const key = `${store.name}|${store.address ?? ''}`
  const photo = storePhotoFor(key)
  return {
    key,
    place: withPlace ? store.area : null,
    hours: store.hours,
    mapUrl: store.mapUrl,
    photo: { src: photo.src, width: photo.width, height: photo.height },
  }
}

function cardWords(t: StoresText): StoreCardWords {
  return {
    address: t('stores.address'),
    hours: t('stores.hours'),
    map: t('stores.map'),
    mapLabel: t('stores.mapLabel'),
  }
}

function nearbyWords(t: StoresText, count: number): NearbyWords {
  return {
    ...cardWords(t),
    lead: t('stores.nearbyLead'),
    leadByArea: t('stores.nearbyLeadByArea'),
    note: t('stores.nearbyNote'),
    finding: t('stores.nearbyFinding'),
    sorted: t('stores.nearbySorted'),
    failed: t('stores.nearbyFailed'),
    seeAll: t('stores.seeAllNearby', { count }),
    fewer: t('stores.seeFewer'),
    every: t('stores.nearbyEvery'),
    distance: t('stores.distance', { distance: '{distance}' }),
    near: t('stores.distanceNear'),
  }
}

function Cards({ stores, t }: { stores: readonly Store[]; t: StoresText }) {
  const words = cardWords(t)
  return (
    <ul className={styles.grid}>
      {stores.map((store) => {
        const card = cardOf(store)
        return <StoreCard key={card.key} store={card} words={words} />
      })}
    </ul>
  )
}

type Section = {
  readonly anchor: string
  readonly label: string
  readonly stores: readonly Store[]
  /**
   * A region of the four with stores past its first: "3 more stores in Ubud", a link that narrows
   * Nearby to them (the skill review of 2026-11-25, T1).
   */
  readonly more: { readonly region: StoreRegionKey; readonly count: number } | null
  /** Nearby: its first stores, the rest behind "See all", and "nearest to me" (`./nearby`). */
  readonly nearby: boolean
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
      ? [{ label: t('stores.flagships'), stores: data.flagships, more: null, nearby: false }]
      : []),
    ...data.regions.map((group) => ({
      label: t(`stores.region.${group.region}`),
      stores: group.stores,
      more: group.more > 0 ? { region: group.region, count: group.more } : null,
      nearby: false,
    })),
    ...(data.nearby.length > 0
      ? [{ label: t('stores.nearby'), stores: data.nearby, more: null, nearby: true }]
      : []),
  ].map((section, index) => ({ ...section, anchor: anchors[index] ?? `area-${index}` }))
  // A region's "N more stores" link lands on Nearby narrowed to them: `#{nearby}-{region}`.
  const nearbyAnchor = sections.find((section) => section.nearby)?.anchor ?? null
  const areas = data.regions
    .filter((group) => group.more > 0)
    .map((group) => ({
      region: group.region,
      lead: t('stores.nearbyArea', { area: t(`stores.region.${group.region}`) }),
    }))
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
            return (
              <section
                key={section.anchor}
                className={styles.area}
                aria-labelledby={section.anchor}
              >
                {section.nearby
                  ? areas.map((area) => (
                      <span
                        key={area.region}
                        id={`${section.anchor}-${area.region}`}
                        className={styles.landing}
                      />
                    ))
                  : null}
                <div className={styles.areaHead}>
                  <h2 id={section.anchor} className={styles.areaTitle}>
                    {section.label}
                  </h2>
                  {/* A count of one says nothing the single card does not (the skill review of 2026-11-25). */}
                  {section.stores.length > 1 ? (
                    <span className={styles.count}>
                      {t('stores.count', { count: section.stores.length })}
                    </span>
                  ) : null}
                </div>
                {section.nearby ? (
                  <NearbyStores
                    stores={data.nearby.map((store) => ({
                      ...cardOf(store, true),
                      position: store.position,
                      region: store.region,
                    }))}
                    preview={NEARBY_PREVIEW}
                    words={nearbyWords(t, data.nearby.length)}
                    locale={locale}
                    anchor={section.anchor}
                    areas={areas}
                  />
                ) : (
                  <Cards stores={section.stores} t={t} />
                )}
                {section.more && nearbyAnchor ? (
                  <p className={styles.moreIn}>
                    <CapsLink href={`#${nearbyAnchor}-${section.more.region}`}>
                      {t('stores.moreIn', { count: section.more.count, area: section.label })}
                    </CapsLink>
                  </p>
                ) : null}
              </section>
            )
          })}
        </>
      )}
    </div>
  )
}
