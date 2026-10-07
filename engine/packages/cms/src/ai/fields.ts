/**
 * The drafting tool's fields on a work (TASKS.md 8.3.a–b; AI.md §5; CONTENT-MODEL.md §3 `aiDraft`):
 *
 * - `cataloguing.aiDraft` — one entry per draftable field: `drafted` (set only by the drafting
 *   tool), `verified` (the box staff tick), and `verifiedBy` / `verifiedAt`, which the server
 *   records from the request's user when the box is ticked (`./audit`) — never typed, never sent.
 * - `cataloguing.aiDraftRun` — the last run: who asked for it and when, and the run's record
 *   (model, prompt version, image ids, usage, the structured output). Payload's version history
 *   keeps every earlier run.
 * - `draftFromPhotosField` — the sidebar's "Draft from photographs" button (`./admin`).
 *
 * The admin shows these read-only; a REST or GraphQL write cannot set them either (`./audit`).
 */
import type { Field, GroupField, UIField } from 'payload'

import { AI_DRAFTABLE_FIELDS, AI_DRAFTABLE_LABELS } from '../collections/works/vocabulary'

/** A duplicate is another object: what was drafted on the original was not drafted on it. */
const cleared = () => ({})

function entry(field: (typeof AI_DRAFTABLE_FIELDS)[number]): GroupField {
  return {
    name: field,
    type: 'group',
    label: AI_DRAFTABLE_LABELS[field],
    // Flat, not in rows: a row is a field without a name, and every entry reads the same four.
    fields: [
      {
        name: 'drafted',
        type: 'checkbox',
        label: { en: 'Drafted', id: 'Dibuat draf' },
        defaultValue: false,
        admin: { readOnly: true },
      },
      {
        name: 'verified',
        type: 'checkbox',
        label: { en: 'Verified', id: 'Diverifikasi' },
        defaultValue: false,
        admin: {
          description: {
            en: 'Tick once you have checked the value against the object.',
            id: 'Centang setelah Anda mencocokkan nilainya dengan objeknya.',
          },
        },
      },
      {
        name: 'verifiedBy',
        type: 'relationship',
        relationTo: 'users',
        label: { en: 'Verified by', id: 'Diverifikasi oleh' },
        admin: { readOnly: true },
      },
      {
        name: 'verifiedAt',
        type: 'date',
        label: { en: 'Verified at', id: 'Diverifikasi pada' },
        admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
      },
    ],
  }
}

export const aiDraftField: GroupField = {
  name: 'aiDraft',
  type: 'group',
  label: { en: 'Drafted by AI, not yet checked', id: 'Dibuat draf oleh AI, belum diperiksa' },
  admin: {
    description: {
      en: 'One entry per field the drafting tool filled. The work cannot publish until each drafted field is ticked Verified; the server records who ticked it and when.',
      id: 'Satu entri per bidang yang diisi alat draf. Karya tidak dapat diterbitkan sampai setiap bidang yang didraf dicentang Diverifikasi; server mencatat siapa yang mencentang dan kapan.',
    },
  },
  hooks: { beforeDuplicate: [cleared] },
  fields: AI_DRAFTABLE_FIELDS.map(entry),
}

export const aiDraftRunField: GroupField = {
  name: 'aiDraftRun',
  type: 'group',
  label: { en: 'Last drafting run', id: 'Pembuatan draf terakhir' },
  admin: {
    readOnly: true,
    description: {
      en: 'Who asked the drafting tool, when, and what it answered. Earlier runs are in the version history.',
      id: 'Siapa yang meminta alat draf, kapan, dan apa jawabannya. Pembuatan draf sebelumnya ada di riwayat versi.',
    },
  },
  hooks: { beforeDuplicate: [cleared] },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'requestedBy',
          type: 'relationship',
          relationTo: 'users',
          label: { en: 'Requested by', id: 'Diminta oleh' },
        },
        {
          name: 'requestedAt',
          type: 'date',
          label: { en: 'Requested at', id: 'Diminta pada' },
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
    {
      name: 'record',
      type: 'json',
      label: { en: 'Run record', id: 'Catatan pembuatan' },
    },
  ],
}

/** The sidebar button; its component decides who sees it (owner and editors only). */
export const draftFromPhotosField: UIField = {
  name: 'draftFromPhotos',
  type: 'ui',
  admin: {
    position: 'sidebar',
    components: { Field: '@engine/cms/admin/views#DraftFromPhotosButton' },
  },
}

export const AI_DRAFT_FIELDS: Field[] = [aiDraftField, aiDraftRunField]
