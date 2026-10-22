/**
 * The gazetteer's own fields (CONTENT-MODEL.md §3): historical names and the geo group. Their
 * rules are pure (`validators/place-historical-names`, `validators/place-geo`); these validators
 * hand each field its share of the answer, so the admin shows every error beside its field and a
 * publish lists them all at once.
 */
import type { ArrayField, GroupField, NumberField, Validate } from 'payload'

import { geoErrors, type Geo, type GeoErrors } from '../../validators/place-geo'
import {
  historicalNameErrors,
  type HistoricalName,
  type RowErrors,
} from '../../validators/place-historical-names'

type Path = readonly (number | string)[]

function historicalNamePart(part: keyof RowErrors): Validate {
  return (_value, { data, path }) => {
    const rows = (data as { historicalNames?: HistoricalName[] } | undefined)?.historicalNames
    const index = Number(path[path.length - 2])
    return historicalNameErrors(rows)[index]?.[part] ?? true
  }
}

export const historicalNamesField: ArrayField = {
  name: 'historicalNames',
  type: 'array',
  labels: {
    singular: { en: 'Historical name', id: 'Nama historis' },
    plural: { en: 'Historical names', id: 'Nama historis' },
  },
  admin: {
    description: {
      en: 'Batavia, Iava, Celebes, Moluccas — every name the place has gone by. Search finds the place under each.',
      id: 'Batavia, Iava, Celebes, Maluku — setiap nama yang pernah dipakai tempat ini. Pencarian menemukan tempat di bawah masing-masing.',
    },
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          maxLength: 160,
          validate: historicalNamePart('name'),
        },
        {
          name: 'language',
          type: 'text',
          maxLength: 35,
          validate: historicalNamePart('language'),
          admin: {
            description: {
              en: 'A language code: nl, la, pt, ms, jv.',
              id: 'Kode bahasa: nl, la, pt, ms, jv.',
            },
          },
        },
        {
          name: 'period',
          type: 'text',
          maxLength: 120,
          admin: {
            description: {
              en: 'When it was used: "1619–1942", "VOC era".',
              id: 'Ketika digunakan: "1619–1942", "era VOC".',
            },
          },
        },
      ],
    },
  ],
}

/** The error a geo field shows, by its path below `geo` (`lat`, `bbox.west`). */
function geoPart(path: Path): keyof GeoErrors {
  return path.slice(path.lastIndexOf('geo') + 1).join('.') as keyof GeoErrors
}

const validateGeo: Validate = (_value, { data, path }) =>
  geoErrors((data as { geo?: Geo } | undefined)?.geo)[geoPart(path)] ?? true

function degrees(name: string, label: { en: string; id: string }): NumberField {
  return { name, type: 'number', label, validate: validateGeo, admin: { step: 0.000001 } }
}

export const geoField: GroupField = {
  name: 'geo',
  type: 'group',
  admin: {
    description: {
      en: 'Where it is, in decimal degrees (WGS 84): the point a locator map pins and, if useful, the box a map of it frames.',
      id: 'Lokasinya, dalam derajat desimal (WGS 84): titik yang ditandai peta penunjuk, dan, bila berguna, kotak yang dibingkai peta.',
    },
  },
  fields: [
    {
      type: 'row',
      fields: [
        degrees('lat', { en: 'Latitude', id: 'Lintang' }),
        degrees('lng', { en: 'Longitude', id: 'Bujur' }),
      ],
    },
    {
      name: 'bbox',
      type: 'group',
      label: { en: 'Bounding box', id: 'Kotak batas' },
      admin: {
        description: {
          en: 'West, south, east and north edges. West may be greater than east for a box across the 180° meridian.',
          id: 'Tepi barat, selatan, timur, dan utara. Barat boleh lebih besar dari timur untuk kotak yang melintasi meridian 180°.',
        },
      },
      fields: [
        {
          type: 'row',
          fields: [
            degrees('west', { en: 'West', id: 'Barat' }),
            degrees('south', { en: 'South', id: 'Selatan' }),
            degrees('east', { en: 'East', id: 'Timur' }),
            degrees('north', { en: 'North', id: 'Utara' }),
          ],
        },
      ],
    },
  ],
}
