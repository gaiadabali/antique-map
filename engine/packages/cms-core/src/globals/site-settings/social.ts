/**
 * A site's social links (`site-settings.<site>.social`): each row names its platform from a list
 * (`network`), not in free text, and its address.
 *
 * `platform` — the name the sites show ("Instagram") — was typed by hand until phase 27 and is
 * what the footers still read. It is now kept for them, hidden and derived: picking a network
 * writes its name there, and a row that only has the old typed name (an older save, the seed)
 * gets its network from that name when it next saves. A typed name that matches no network must
 * be given one: the row is refused until it is.
 */
import type { ArrayField, FieldHook } from 'payload'

export const SOCIAL_NETWORKS = [
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'pinterest',
  'x',
  'linkedin',
  'threads',
] as const
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number]

/** The name each network goes by, the same in both languages: what `platform` holds. */
export const SOCIAL_NETWORK_NAMES: Readonly<Record<SocialNetwork, string>> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  pinterest: 'Pinterest',
  x: 'X',
  linkedin: 'LinkedIn',
  threads: 'Threads',
}

/** Typed names that mean a network under another name. */
const ALSO_KNOWN_AS: Readonly<Record<string, SocialNetwork>> = { twitter: 'x' }

/** The network a typed platform name means, ignoring case and spaces, or `null`. */
export function networkOfName(name: unknown): SocialNetwork | null {
  if (typeof name !== 'string') return null
  const key = name.trim().toLowerCase().replace(/\s+/g, '')
  if (key in ALSO_KNOWN_AS) return ALSO_KNOWN_AS[key]!
  return SOCIAL_NETWORKS.find((network) => network === key) ?? null
}

const isNetwork = (value: unknown): value is SocialNetwork =>
  (SOCIAL_NETWORKS as readonly unknown[]).includes(value)

/** Keeps `network` and the shown `platform` name in step, before either is validated. */
export const networkAndName: FieldHook = ({ value, siblingData }) => {
  const sibling = siblingData as { platform?: unknown } | undefined
  const network = isNetwork(value) ? value : networkOfName(sibling?.platform)
  if (network !== null && sibling) sibling.platform = SOCIAL_NETWORK_NAMES[network]
  return network ?? value
}

export function socialField(): ArrayField {
  return {
    name: 'social',
    type: 'array',
    label: { en: 'Social links', id: 'Tautan sosial' },
    labels: {
      singular: { en: 'Social link', id: 'Tautan sosial' },
      plural: { en: 'Social links', id: 'Tautan sosial' },
    },
    fields: [
      {
        type: 'row',
        fields: [
          {
            // No `required`: a column added beside rows that have none cannot be NOT NULL. The
            // validation asks for it instead, after `networkAndName` has derived what it can.
            name: 'network',
            type: 'select',
            label: { en: 'Platform', id: 'Platform' },
            options: SOCIAL_NETWORKS.map((value) => ({
              value,
              label: { en: SOCIAL_NETWORK_NAMES[value], id: SOCIAL_NETWORK_NAMES[value] },
            })),
            hooks: { beforeValidate: [networkAndName] },
            validate: (value: unknown) =>
              isNetwork(value) ? true : 'Choose the platform this link is for.',
            admin: { width: '30%' },
          },
          {
            name: 'url',
            type: 'text',
            required: true,
            maxLength: 2048,
            label: { en: 'URL', id: 'URL' },
            admin: { width: '70%' },
          },
        ],
      },
      {
        // Derived from `network` (`networkAndName`); the sites read it until they read `network`.
        name: 'platform',
        type: 'text',
        required: true,
        maxLength: 60,
        label: { en: 'Platform name shown', id: 'Nama platform yang tampil' },
        admin: { hidden: true },
      },
    ],
  }
}
