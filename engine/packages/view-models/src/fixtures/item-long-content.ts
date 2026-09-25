/**
 * @contract C2 — fixture `item-long-content` · owner: ARC
 * The stress state (DESIGN-SYSTEM.md §3): a long Dutch hook title, a 300-character Latin
 * transcription, an extreme rupiah price (Rp 1.250.000.000), a missing hook title's
 * designed fallback elsewhere, and images at aspects 0.3 and 3.5.
 */
import type { ItemVM } from '../surfaces/item'
import { originalItem, uniqueBase } from './_item'
import { image, money, price } from './_shared'

const latin =
  'Tabula nova et accuratissima Insulae Exempli cum omnibus suis portubus, sinubus, ' +
  'promontoriis, fluminibus et oppidis, ex observationibus recentissimis nautarum ' +
  'peritissimorum delineata et in lucem edita, cum privilegio ordinum generalium, ' +
  'anno a nativitate Domini millesimo septingentesimo decimo octavo, opera et studio.'

const base = originalItem({
  ...uniqueBase,
  price: { kind: 'fixed', price: price(money(1250000000, 'IDR')) },
  state: { kind: 'available' },
  actions: { primary: { action: 'buy', productId: 'prod-1005' }, secondary: [] },
  shipsFrom: 'Jakarta',
})

export const itemLongContent: ItemVM = {
  ...base,
  title:
    'Nieuwe en zeer nauwkeurige kaart van het Eiland Contoh met alle zijne havens, ' +
    'baaien en rivieren — de eerste volledige opmeting door Hendrik Voorbeeld',
  originalTitle: latin,
  media: {
    ...base.media,
    primary: image('tall-1005', 900, 3000, 'A costume print, very tall and narrow (0.3 : 1)'),
    images: [
      image('tall-1005', 900, 3000, 'A costume print, very tall and narrow (0.3 : 1)'),
      image('wide-1005', 3500, 1000, 'A coastal profile, very wide (3.5 : 1)', 'detail'),
      image('square-1005', 2000, 2000, 'A square detail of the compass rose (1 : 1)', 'detail'),
    ],
  },
}

/** A migrated item with no hook title yet: the original title leads, the maker line rises. */
export const itemWithoutHookTitle: ItemVM = {
  ...base,
  title: 'Nieuwe Kaart van het Eyland Contoh',
  hasHookTitle: false,
  originalTitle: null,
}
