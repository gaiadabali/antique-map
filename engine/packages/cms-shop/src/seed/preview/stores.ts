/**
 * The client preview's stores and settings steps (`./index`):
 *
 * - **stores** — a store's region is its `area` when that is exactly Lombok, Ubud, Amed or Canggu
 *   (any case), else none; the flagships are the first Ubud store and the first Canggu store by id.
 * - **settings** — the newsletter pop-up on, and the shop's WhatsApp set to the preview's number.
 *
 * Each write happens only where the record differs, so a second run writes nothing.
 */
import { seedShopKeys } from '../purge'
import { allOf, writeOf, type Step } from './shared'

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

/**
 * `seedCodes` is the seed sheet's store codes. `code` is a staff-only field, which `allOf` reads
 * (it overrides access); a store without a code in the list is a real one and is left alone.
 */
export async function seedStoreRegions(
  step: Step,
  seedCodes: readonly string[] = seedShopKeys().storeCodes,
): Promise<StoresReport> {
  const seeds = new Set(seedCodes)
  const stores = (await allOf(step, 'stores')).filter((each) => seeds.has(String(each.code ?? '')))
  const flagshipIds = new Set<number>()
  for (const region of FLAGSHIP_REGIONS) {
    const first = stores.find((each) => regionOf(each.area) === region)
    if (first) flagshipIds.add(first.id)
  }
  let changed = 0
  for (const store of stores) {
    const region = regionOf(store.area)
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
