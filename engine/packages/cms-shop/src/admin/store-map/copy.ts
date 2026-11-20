/**
 * Copy for the store location field (TASKS.md 27.4.a). Every key is bilingual (AGENTS.md: "Copy
 * lives in keyed lexicon files, never in components"); `{n}`-style holes are filled by `L`'s `vars`.
 */
export type Language = 'en' | 'id'
export type Bilingual = { readonly en: string; readonly id: string }

function t<K extends string>(entries: Record<K, Bilingual>): Record<K, Bilingual> {
  return entries
}

export const STORE_MAP_COPY = t({
  label: { en: 'Find the location', id: 'Cari lokasi' },
  help: {
    en: 'Search the address, or paste a Google Maps link or "lat, lng". Pick the right place and the pin below fills in. Then check it on Google Maps and move it a few metres if it is off.',
    id: 'Cari alamatnya, atau tempel tautan Google Maps atau "lat, lng". Pilih tempat yang benar dan titik di bawah terisi. Lalu periksa di Google Maps dan geser beberapa meter bila meleset.',
  },
  searchLabel: { en: 'Address or Maps link', id: 'Alamat atau tautan Maps' },
  searchPlaceholder: {
    en: 'e.g. Jl. Raya Ubud 12, Gianyar',
    id: 'mis. Jl. Raya Ubud 12, Gianyar',
  },
  search: { en: 'Search', id: 'Cari' },
  searching: { en: 'Searching…', id: 'Mencari…' },
  candidates: { en: 'Places found — pick one', id: 'Tempat ditemukan — pilih satu' },
  noneFound: {
    en: 'Nothing found in Indonesia. Try the street and the area, or paste a Google Maps link.',
    id: 'Tidak ada yang ditemukan di Indonesia. Coba jalan dan daerahnya, atau tempel tautan Google Maps.',
  },
  keyless: {
    en: 'Address search is not set up on this server (no Maps key). Paste a Google Maps link or "lat, lng" instead, or type the pin below.',
    id: 'Pencarian alamat belum diatur di server ini (tanpa kunci Maps). Tempel tautan Google Maps atau "lat, lng", atau ketik titiknya di bawah.',
  },
  failed: { en: 'The search did not answer: {reason}', id: 'Pencarian tidak menjawab: {reason}' },
  tryAgain: { en: 'try again.', id: 'coba lagi.' },
  pinNone: {
    en: 'No pin yet. Search above, or type the latitude and longitude below.',
    id: 'Belum ada titik. Cari di atas, atau ketik lintang dan bujur di bawah.',
  },
  pin: { en: 'Pin: {pin}', id: 'Titik: {pin}' },
  pinOutside: {
    en: 'This pin is outside Indonesia — check the two numbers were not swapped.',
    id: 'Titik ini di luar Indonesia — periksa kedua angka tidak tertukar.',
  },
  check: { en: 'Check on Google Maps', id: 'Periksa di Google Maps' },
  checkNote: { en: '(opens a new tab)', id: '(membuka tab baru)' },
  moveLegend: { en: 'Move the pin', id: 'Geser titik' },
  step: { en: 'Step', id: 'Langkah' },
  metres: { en: '{n} m', id: '{n} m' },
  north: { en: 'North', id: 'Utara' },
  south: { en: 'South', id: 'Selatan' },
  east: { en: 'East', id: 'Timur' },
  west: { en: 'West', id: 'Barat' },
  moveLabel: { en: 'Move the pin {n} m {direction}', id: 'Geser titik {n} m ke {direction}' },
  pinSet: { en: 'Pin set to {pin}.', id: 'Titik diatur ke {pin}.' },
  addressFilled: {
    en: 'The address was empty, so the place’s address was put in. Check it.',
    id: 'Alamat kosong, jadi alamat tempat itu dimasukkan. Periksa kembali.',
  },
})

export type CopyKey = keyof typeof STORE_MAP_COPY

export function L(
  key: CopyKey,
  language: Language | string | undefined,
  vars: Record<string, string | number> = {},
): string {
  const entry = STORE_MAP_COPY[key]
  const text = language === 'id' ? entry.id : entry.en
  return text.replace(/\{(\w+)\}/g, (hole, name: string) =>
    vars[name] === undefined ? hole : String(vars[name]),
  )
}
