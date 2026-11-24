/**
 * The shop's general blocks that place a video or a PDF from Media (CONTENT-MODEL.md §6): a video
 * that plays on the page, with the player's own controls, and a link that opens a PDF. Each takes
 * only its own kind of file (`VIDEOS_ONLY`, `PDFS_ONLY`: the admin's picker, and Payload's upload
 * validation on every save), and the video's poster only an image. A file placed here is what
 * the public may fetch once the page is published (`@engine/http/media`), and nothing else is.
 */
import { IMAGES_ONLY, PDFS_ONLY, VIDEOS_ONLY } from '@engine/cms-core/collections/media/kinds'
import type { Block } from 'payload'

import { anchor, line } from './fields'

export const VideoBlock: Block = {
  slug: 'video',
  labels: { singular: { en: 'Video', id: 'Video' }, plural: { en: 'Videos', id: 'Video' } },
  fields: [
    {
      name: 'video',
      type: 'upload',
      relationTo: 'media',
      filterOptions: VIDEOS_ONLY,
      required: true,
      label: { en: 'Video (MP4 or WebM)', id: 'Video (MP4 atau WebM)' },
      admin: {
        description: {
          en: 'Upload it to Media first, with its title and a description of what happens in it. It plays with its controls showing, never on its own.',
          id: 'Unggah dulu ke Media, dengan judul dan deskripsi apa yang terjadi di dalamnya. Video diputar dengan tombol kendalinya, tidak pernah berputar sendiri.',
        },
      },
    },
    {
      name: 'poster',
      type: 'upload',
      relationTo: 'media',
      filterOptions: IMAGES_ONLY,
      label: { en: 'Still image (optional)', id: 'Gambar diam (opsional)' },
      admin: {
        description: {
          en: 'Shown before the video plays. Without one, the browser shows the video’s first frame.',
          id: 'Ditampilkan sebelum video diputar. Tanpa gambar ini, peramban menampilkan bingkai pertama video.',
        },
      },
    },
    line('caption', { en: 'Caption', id: 'Keterangan' }, { max: 300 }),
    anchor(),
  ],
}

export const DocumentLinkBlock: Block = {
  slug: 'documentLink',
  labels: {
    singular: { en: 'PDF link', id: 'Tautan PDF' },
    plural: { en: 'PDF links', id: 'Tautan PDF' },
  },
  fields: [
    {
      name: 'document',
      type: 'upload',
      relationTo: 'media',
      filterOptions: PDFS_ONLY,
      required: true,
      label: { en: 'PDF', id: 'PDF' },
      admin: {
        description: {
          en: 'Upload it to Media first, with its title. At most 20 MB.',
          id: 'Unggah dulu ke Media, dengan judulnya. Paling besar 20 MB.',
        },
      },
    },
    line(
      'label',
      { en: 'Link text', id: 'Teks tautan' },
      {
        max: 80,
        note: {
          en: 'Optional: the PDF’s title is used when empty, e.g. “Download the wholesale price list”.',
          id: 'Opsional: judul PDF dipakai bila kosong, mis. “Unduh daftar harga grosir”.',
        },
      },
    ),
    line('note', { en: 'Short note', id: 'Catatan singkat' }, { max: 200 }),
    anchor(),
  ],
}

export const MEDIA_BLOCKS: readonly Block[] = [VideoBlock, DocumentLinkBlock]
