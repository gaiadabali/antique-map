/**
 * The committed additions: designs the owner sells that his six catalogue PDFs do not hold, kept
 * in the repo with their pictures so every environment — staging included, through the admin's
 * seed screen — seeds them alike. Each is a `DesignRecord` (`../types`) and its picture, named by
 * a `new URL()` the app's bundler follows, so the file ships with the release.
 *
 * To add one: put its picture in `./images`, then add an entry below. Its `catalogues` names the
 * shop category through `../naming`'s `PRIORITY` (`Antique Prints` → Antique prints).
 */
import type { DesignRecord } from '../types'

type Addition = { readonly record: Omit<DesignRecord, 'image'>; readonly image: URL }

export const ADDITIONS: readonly Addition[] = [
  {
    record: {
      code: 'AP.2033',
      title: 'River Jurong, Singapore',
      heading: 'River Jurong, Singapore ~ Year 1854',
      date: {
        display: '1854',
        precision: 'exact',
        year: 1854,
      },
      artist: 'Peter Bernhard Wilhelm Heine',
      catalogues: ['Antique Prints'],
      description_en:
        "This print (lithograph) depicts a canoe with an American flag on its stern drawing near the huts on the Jurong river bank. The artist, Peter Bernhard Wilhelm Heine, had been on board Commodore Matthew Perry's 1854 expedition to Japan to demand that it open its ports to world trade. Heine drew this image while the squadron stopped at Jurong Point in Singapore on the way to Japan. Also observable in the background is a raging fire in the town, which was a common sight in the 19th century. This print was published in F.L. Hawkes' 'Narrative of the Expedition of an American Squadron to the China Seas and Japan in the Years 1852, 1853 and 1854 under the Command of the Commodore M.C. Perry, United States Navy' in 1856. Reproduced from the original lithograph (London, 1854; image 30 by 22 cm).",
      name_id: 'Sungai Jurong, Singapura',
      description_id:
        "Cetakan (litografi) ini menggambarkan sebuah kano berbendera Amerika di buritannya yang mendekati gubuk-gubuk di tepi Sungai Jurong. Senimannya, Peter Bernhard Wilhelm Heine, ikut dalam ekspedisi Komodor Matthew Perry ke Jepang pada tahun 1854 untuk menuntut Jepang membuka pelabuhannya bagi perdagangan dunia. Heine menggambar pemandangan ini ketika armada singgah di Jurong Point, Singapura, dalam perjalanan ke Jepang. Di latar belakang juga terlihat kebakaran besar di kota, pemandangan yang lazim pada abad ke-19. Cetakan ini diterbitkan dalam buku F.L. Hawkes, 'Narrative of the Expedition of an American Squadron to the China Seas and Japan in the Years 1852, 1853 and 1854 under the Command of the Commodore M.C. Perry, United States Navy', pada tahun 1856. Direproduksi dari litografi aslinya (London, 1854; ukuran gambar 30 x 22 cm).",
    },
    image: new URL('./images/AP.2033.webp', import.meta.url),
  },
]
