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
          meta: [{ code: 'available', params: { count: 3 } }],
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
          meta: [
            // Each date formatted with its precision, so a circa birth keeps its "c." (v1.5).
            { code: 'lifeDates', params: { born: 'c. 1671', died: '1733' } },
            { code: 'available', params: { count: 18 } },
          ],
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
          meta: [{ code: 'works', params: { count: 24 } }],
          children: [
            {
              title: 'Kota Lama',
              href: '/places/contoh/kota-lama',
              image: null,
              meta: [{ code: 'works', params: { count: 6 } }],
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
