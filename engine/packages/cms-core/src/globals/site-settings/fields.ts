/**
 * `site-settings`'s field builders, one per group shared or site-specific (`./index`): contact,
 * AI and the shop's delivery table (the social-links array is `./social`'s). Split out so the global's own config
 * file stays under the file-size limit (AGENTS.md).
 */
/**
 * How to reach the site. `address` (the shop's, TASKS.md 28.1): a postal address in each
 * language, for the header, the footer and the menu.
 */
export function contactGroup(
  label: { en: string; id: string },
  options: { address?: boolean } = {},
): import('payload').GroupField {
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
      ...(options.address
        ? [
            {
              name: 'address',
              type: 'textarea',
              localized: true,
              maxLength: 300,
              label: { en: 'Address', id: 'Alamat' },
              admin: {
                rows: 2,
                description: {
                  en: 'Shown with the phone, WhatsApp and email at the top and bottom of the site and in its menu.',
                  id: 'Ditampilkan bersama telepon, WhatsApp, dan email di bagian atas dan bawah situs serta di menunya.',
                },
              },
            } as import('payload').Field,
          ]
        : []),
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
        admin: {
          description: {
            en: 'Turns the chat helper on for this site. Off means visitors do not see it.',
            id: 'Menyalakan asisten chat di situs ini. Jika mati, pengunjung tidak melihatnya.',
          },
        },
      },
      {
        name: 'draftingEnabled',
        type: 'checkbox',
        defaultValue: false,
        label: { en: 'Drafting enabled', id: 'Pembuatan draf aktif' },
        admin: {
          description: {
            en: 'Lets staff use Draft from photos to get a suggested title and description. Off hides that button.',
            id: 'Membolehkan staf memakai Draf dari foto untuk usulan judul dan deskripsi. Jika mati, tombolnya disembunyikan.',
          },
        },
      },
      {
        name: 'dailyBudgetUsd',
        type: 'number',
        min: 0,
        defaultValue: 5,
        label: { en: 'Daily budget (USD)', id: 'Anggaran harian (USD)' },
        admin: {
          description: {
            en: 'The most the chat may cost in one day, in US dollars. Once it is used up, the chat pauses until tomorrow.',
            id: 'Biaya chat paling banyak dalam sehari, dalam dolar AS. Jika habis, chat berhenti sampai besok.',
          },
        },
      },
      {
        name: 'sessionTokenCap',
        type: 'number',
        min: 0,
        defaultValue: 150_000,
        label: { en: 'Session token cap', id: 'Batas token per sesi' },
        admin: {
          description: {
            en: 'How long one visitor can chat before the chat stops for them. Raise it for longer conversations; lower it to save cost.',
            id: 'Seberapa lama satu pengunjung bisa mengobrol sebelum chat berhenti untuknya. Naikkan untuk obrolan lebih panjang; turunkan untuk menghemat biaya.',
          },
        },
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
        label: { en: 'Distance bands', id: 'Rentang jarak' },
        admin: {
          initCollapsed: false,
          description: {
            en: 'The delivery fee by distance from the sending store. Checkout prices delivery from these, and the chat helper quotes them. Only an address beyond the last band waits for staff to set its fee by hand.',
            id: 'Ongkir menurut jarak dari toko pengirim. Checkout menghitung ongkir dari tabel ini, dan asisten chat menyebutnya. Hanya alamat di luar rentang terakhir yang menunggu staf mengisi ongkirnya.',
          },
        },
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
        admin: {
          step: 1,
          description: {
            en: 'Orders above this amount ship free. Leave it at 0 for no free delivery.',
            id: 'Pesanan di atas jumlah ini gratis ongkir. Isi 0 jika tidak ada gratis ongkir.',
          },
        },
      },
    ],
  }
}
