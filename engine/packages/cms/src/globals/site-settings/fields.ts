/**
 * `site-settings`'s field builders, one per group shared or site-specific (`./index`): contact,
 * AI, the social-links array and the shop's delivery table. Split out so the global's own config
 * file stays under the file-size limit (AGENTS.md).
 */
export function contactGroup(label: { en: string; id: string }): import('payload').GroupField {
  return {
    name: 'contact',
    type: 'group',
    label,
    fields: [
      {
        name: 'whatsapp',
        type: 'text',
        maxLength: 16,
        label: { en: 'WhatsApp', id: 'WhatsApp' },
        validate: (value: unknown) => {
          if (!value) return true
          return /^\+[1-9]\d{6,14}$/.test(String(value))
            ? true
            : 'Give a WhatsApp number in international format, such as +62 812 3456 7890.'
        },
      },
      {
        name: 'email',
        type: 'email',
        label: { en: 'Email', id: 'Email' },
      },
      {
        name: 'phone',
        type: 'text',
        maxLength: 24,
        label: { en: 'Phone', id: 'Telepon' },
      },
    ],
  }
}

export function aiGroup(label: { en: string; id: string }): import('payload').GroupField {
  return {
    name: 'ai',
    type: 'group',
    label,
    fields: [
      {
        name: 'chatEnabled',
        type: 'checkbox',
        defaultValue: false,
        label: { en: 'Chat enabled', id: 'Chat aktif' },
      },
      {
        name: 'draftingEnabled',
        type: 'checkbox',
        defaultValue: false,
        label: { en: 'Drafting enabled', id: 'Pembuatan draf aktif' },
      },
      {
        name: 'dailyBudgetUsd',
        type: 'number',
        min: 0,
        defaultValue: 5,
        label: { en: 'Daily budget (USD)', id: 'Anggaran harian (USD)' },
      },
      {
        name: 'sessionTokenCap',
        type: 'number',
        min: 0,
        defaultValue: 150_000,
        label: { en: 'Session token cap', id: 'Batas token per sesi' },
      },
    ],
  }
}

export function socialField(): import('payload').ArrayField {
  return {
    name: 'social',
    type: 'array',
    label: { en: 'Social links', id: 'Tautan sosial' },
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'platform',
            type: 'text',
            required: true,
            maxLength: 60,
            label: { en: 'Platform', id: 'Platform' },
          },
          {
            name: 'url',
            type: 'text',
            required: true,
            maxLength: 2048,
            label: { en: 'URL', id: 'URL' },
          },
        ],
      },
    ],
  }
}

export function deliveryGroup(label: { en: string; id: string }): import('payload').GroupField {
  return {
    name: 'delivery',
    type: 'group',
    label,
    fields: [
      {
        name: 'bands',
        type: 'array',
        label: { en: 'Distance bands', id: 'Gelombang jarak' },
        fields: [
          {
            type: 'row',
            fields: [
              {
                name: 'upToKm',
                type: 'number',
                required: true,
                min: 0,
                label: { en: 'Up to km', id: 'Hingga km' },
                admin: { step: 0.1 },
              },
              {
                name: 'feeIdr',
                type: 'number',
                required: true,
                min: 0,
                label: { en: 'Fee (IDR)', id: 'Ongkir (IDR)' },
                admin: { step: 1 },
              },
            ],
          },
        ],
      },
      {
        name: 'freeOverIdr',
        type: 'number',
        min: 0,
        defaultValue: 500000,
        label: { en: 'Free delivery over (IDR)', id: 'Gratis ongkir di atas (IDR)' },
        admin: { step: 1 },
      },
    ],
  }
}
