/**
 * @contract C2 — fixture `directory` · owner: ARC
 * Index pages: makers A–Z and the place tree (a drill-down on a phone).
 */
import type { DirectoryVM } from '../surfaces/listing'
import { image, seo } from './_shared'

export const makerDirectory: DirectoryVM = {
  surface: 'maker',
  directory: true,
  title: 'Makers',
  intro: null,
  groups: [
    {
      title: 'P',
      entries: [
        {
          title: 'PROEF, Jan',
          href: '/makers/proef',
          image: null,
          meta: '3 available',
          children: [],
        },
      ],
    },
    {
      title: 'V',
      entries: [
        {
          title: 'VOORBEELD, Hendrik',
          href: '/makers/voorbeeld',
          image: image('portrait-voorbeeld', 800, 1000, 'Portrait of Hendrik Voorbeeld'),
          meta: 'c. 1671–1733 · 18 available',
          children: [],
        },
      ],
    },
  ],
  pagination: null,
  seo: seo('Makers', '/makers'),
  breadcrumbs: [],
}

export const placeDirectory: DirectoryVM = {
  surface: 'place',
  directory: true,
  title: 'Places',
  intro: null,
  groups: [
    {
      title: null,
      entries: [
        {
          title: 'Pulau Contoh',
          href: '/places/contoh',
          image: null,
          meta: '24 works',
          children: [
            {
              title: 'Kota Lama',
              href: '/places/contoh/kota-lama',
              image: null,
              meta: '6 works',
              children: [],
            },
          ],
        },
      ],
    },
  ],
  pagination: null,
  seo: seo('Places', '/places'),
  breadcrumbs: [],
}
