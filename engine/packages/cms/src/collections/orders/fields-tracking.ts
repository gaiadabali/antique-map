/**
 * Where an order stands (COMMERCE.md §6–§10): its status and the history of every move, the
 * payment attempts, the driver's details, the hash of the buyer's tracking token, the payment
 * window and the hand-back flag. The status machine, the history entries and the uploads are the
 * order code's (phases 6–7); here is the shape, and who may touch which part (`./access`).
 */
import type { Field } from 'payload'

import { ATTENTION_ACCESS, NEVER_EXPOSED, SERVER_ONLY, STATUS_ACCESS } from './access'
import { ORDER_STATUS_OPTIONS } from './statuses'

export const TRACKING_FIELDS: Field[] = [
  {
    name: 'status',
    type: 'select',
    label: { en: 'Status', id: 'Status' },
    options: ORDER_STATUS_OPTIONS,
    required: true,
    defaultValue: 'pending_payment',
    index: true,
    access: STATUS_ACCESS,
    admin: { position: 'sidebar' },
  },
  {
    name: 'history',
    type: 'array',
    label: { en: 'History', id: 'Riwayat' },
    access: SERVER_ONLY,
    admin: { readOnly: true },
    fields: [
      { name: 'from', type: 'select', label: { en: 'From', id: 'Dari' }, options: ORDER_STATUS_OPTIONS },
      {
        name: 'to',
        type: 'select',
        label: { en: 'To', id: 'Ke' },
        options: ORDER_STATUS_OPTIONS,
        required: true,
      },
      { name: 'at', type: 'date', label: { en: 'At', id: 'Pada' }, required: true },
      {
        name: 'actor',
        type: 'select',
        label: { en: 'Moved by', id: 'Dipindahkan oleh' },
        options: ['user', 'midtrans', 'system'],
        required: true,
        defaultValue: 'user',
      },
      { name: 'by', type: 'relationship', relationTo: 'users', label: { en: 'Staff member', id: 'Staf' } },
      { name: 'note', type: 'textarea', label: { en: 'Note', id: 'Catatan' }, maxLength: 500 },
    ],
  },
  {
    name: 'payment',
    type: 'group',
    label: { en: 'Payment', id: 'Pembayaran' },
    access: SERVER_ONLY,
    admin: { readOnly: true },
    fields: [
      {
        name: 'attempts',
        type: 'array',
        label: { en: 'Attempts', id: 'Percobaan' },
        fields: [
          {
            name: 'midtransOrderId',
            type: 'text',
            label: { en: 'Midtrans order id', id: 'Id pesanan Midtrans' },
            required: true,
            maxLength: 64,
          },
          // A Snap token reopens the payment pop-up: never in any API response (COMMERCE.md §8).
          {
            name: 'snapToken',
            type: 'text',
            label: { en: 'Snap token', id: 'Token Snap' },
            maxLength: 200,
            access: NEVER_EXPOSED,
          },
          {
            name: 'createdAt',
            type: 'date',
            label: { en: 'Created', id: 'Dibuat' },
            required: true,
          },
          { name: 'state', type: 'text', label: { en: 'State', id: 'Status' }, maxLength: 40 },
        ],
      },
      { name: 'method', type: 'text', label: { en: 'Method', id: 'Metode' }, maxLength: 40 },
      {
        name: 'transactionId',
        type: 'text',
        label: { en: 'Transaction id', id: 'Id transaksi' },
        maxLength: 64,
      },
      { name: 'paidAt', type: 'date', label: { en: 'Paid at', id: 'Dibayar pada' } },
    ],
  },
  {
    name: 'driverImage',
    type: 'group',
    label: { en: 'Driver’s details', id: 'Data pengemudi' },
    access: SERVER_ONLY,
    admin: { readOnly: true },
    // The private bucket's key (`orders/{id}/…`), read through a short-lived presigned URL (§9).
    fields: [
      { name: 'key', type: 'text', label: { en: 'File key', id: 'Kunci berkas' }, maxLength: 300 },
      {
        name: 'contentType',
        type: 'text',
        label: { en: 'Content type', id: 'Jenis berkas' },
        maxLength: 40,
      },
      { name: 'width', type: 'number', label: { en: 'Width', id: 'Lebar' } },
      { name: 'height', type: 'number', label: { en: 'Height', id: 'Tinggi' } },
      { name: 'uploadedAt', type: 'date', label: { en: 'Uploaded', id: 'Diunggah' } },
      {
        name: 'uploadedBy',
        type: 'relationship',
        relationTo: 'users',
        label: { en: 'Uploaded by', id: 'Diunggah oleh' },
      },
    ],
  },
  {
    // SHA-256 of the buyer's tracking token, hex; the token itself is never stored (§10).
    name: 'trackingTokenHash',
    type: 'text',
    label: { en: 'Tracking token hash', id: 'Hash token pelacakan' },
    required: true,
    unique: true,
    access: NEVER_EXPOSED,
    admin: { hidden: true },
  },
  {
    name: 'expiresAt',
    type: 'date',
    label: { en: 'Pay by', id: 'Bayar sebelum' },
    access: SERVER_ONLY,
    admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
  },
  {
    name: 'needsAttention',
    type: 'group',
    label: { en: 'Handed back', id: 'Dikembalikan' },
    access: ATTENTION_ACCESS,
    admin: {
      description: {
        en: 'Store staff: hand the order back with a reason if your store cannot send it.',
        id: 'Staf toko: kembalikan pesanan dengan alasan bila toko Anda tidak dapat mengirimnya.',
      },
    },
    fields: [
      { name: 'flag', type: 'checkbox', label: { en: 'Handed back', id: 'Dikembalikan' }, defaultValue: false },
      { name: 'reason', type: 'textarea', label: { en: 'Reason', id: 'Alasan' }, maxLength: 500 },
    ],
  },
]
