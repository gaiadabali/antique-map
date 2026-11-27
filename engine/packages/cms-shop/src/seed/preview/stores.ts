/**
 * The client preview's stores and settings steps (`./index`):
 *
 * - **stores** — on the seed stores only (a real store keeps what the owner set): a store's region is its `area` when that is exactly Lombok, Ubud, Amed or Canggu
 *   (any case), else none; the flagships are the first Ubud store and the first Canggu store by id.
 *   While no store is in Lombok, one seed store stands in for it (`lombokPlaceholderId`).
 * - **settings** — the newsletter pop-up on, and the shop's WhatsApp set to the preview's number.
 *
 * Each write happens only where the record differs, so a second run writes nothing.
 */
import { allOf, writeOf, type Doc, type Step } from './shared'

const REGIONS = ['lombok', 'ubud', 'amed', 'canggu'] as const
const FLAGSHIP_REGIONS = ['ubud', 'canggu'] as const

export const PREVIEW_WHATSAPP = '+6281299253712'

export type StoresReport = { stores: number; changed: number; flagships: number }

export function regionOf(area: unknown): string | null {
  const text = String(area ?? '')
    .trim()
    .toLowerCase()
  return (REGIONS as readonly string[]).includes(text) ? text : null
}

/** Every store the seed sheet makes is named "Seed store, <Area> 00N" (`../shop/data/stores.csv`). */
const SEED_NAME = /^Seed store, /

/** A seed store, by its seed name; any other store is a real one, and the preview leaves it alone. */
export const isSeedStore = (store: object): boolean =>
  SEED_NAME.test(String((store as { name?: unknown }).name ?? ''))

/**
 * The Lombok placeholder (the owner's request, 2026-11-27): the seed sheet has no Lombok store, so
 * the stores page would never show its Lombok card. While no store at all is in Lombok, the first
 * seed store (by id) with no region of its own stands in for one. A real Lombok store retires it on
 * the next run.
 */
function lombokPlaceholderId(all: readonly Doc[], seeds: readonly Doc[]): number | null {
  const inLombok = (each: Doc) =>
    regionOf(each.area) === 'lombok' || (!isSeedStore(each) && each.region === 'lombok')
  if (all.some(inLombok)) return null
  const free = seeds.filter((each) => regionOf(each.area) === null).sort((a, b) => a.id - b.id)
  return free[0]?.id ?? null
}

export async function seedStoreRegions(step: Step): Promise<StoresReport> {
  const all = await allOf(step, 'stores')
  const stores = all.filter((each) => isSeedStore(each))
  const flagshipIds = new Set<number>()
  for (const region of FLAGSHIP_REGIONS) {
    const first = stores.find((each) => regionOf(each.area) === region)
    if (first) flagshipIds.add(first.id)
  }
  const lombokId = lombokPlaceholderId(all, stores)
  let changed = 0
  for (const store of stores) {
    const region = store.id === lombokId ? 'lombok' : regionOf(store.area)
    const flagship = flagshipIds.has(store.id)
    if ((store.region ?? null) === region && (store.flagship === true) === flagship) continue
    await step.payload.update({
      collection: 'stores',
      id: store.id,
      ...writeOf(step),
      data: { region, flagship } as never,
    })
    changed += 1
  }
  return { stores: stores.length, changed, flagships: flagshipIds.size }
}

type ShopSettings = {
  shop?: { newsletter?: { enabled?: boolean | null }; contact?: { whatsapp?: string | null } }
}

/** The pop-up on and the preview's WhatsApp; `true` when anything was written. */
export async function seedPreviewSettings(step: Step): Promise<boolean> {
  const settings = (await step.payload.findGlobal({
    slug: 'site-settings',
    ...writeOf(step),
    depth: 0,
  })) as unknown as ShopSettings
  const popUp = settings.shop?.newsletter?.enabled === true
  const whatsapp = settings.shop?.contact?.whatsapp === PREVIEW_WHATSAPP
  if (popUp && whatsapp) return false
  await step.payload.updateGlobal({
    slug: 'site-settings',
    ...writeOf(step),
    data: {
      shop: {
        newsletter: { enabled: true },
        contact: { whatsapp: PREVIEW_WHATSAPP },
      },
    } as never,
  })
  return true
}
