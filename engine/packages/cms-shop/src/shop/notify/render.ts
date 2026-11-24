/**
 * An email's body as rows, rendered twice: plain text, and a simple HTML twin (COMMERCE.md §11).
 * A row is text, a blank, or a labelled link. Every piece of text is escaped for the HTML part —
 * the opening is the owner's own words (`./wording`) and an order line names a product — and only
 * a link row becomes a link, so no text, whatever it says, turns into markup or a link.
 */
import type { MailMessage } from './transport'

export type Row = string | { readonly label: string; readonly url: string }

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (c) => ESCAPES[c]!)

/** The rows as `MailMessage` text and HTML; `subject` is sent as given (a header, never HTML). */
export function render(to: string, subject: string, rows: readonly Row[]): MailMessage {
  const text = rows
    .map((row) => (typeof row === 'string' ? row : `${row.label} ${row.url}`.trim()))
    .join('\n')
  const html = rows
    .map((row) => {
      if (typeof row !== 'string') {
        const url = escapeHtml(row.url)
        const label = row.label === '' ? '' : `${escapeHtml(row.label)} `
        return `<p>${label}<a href="${url}">${url}</a></p>`
      }
      return row === '' ? '<br />' : `<p>${escapeHtml(row)}</p>`
    })
    .join('\n')
  return { to, subject, text, html }
}

export const rupiahOf = (amountIdr: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amountIdr)
