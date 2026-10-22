/**
 * List cells (TASKS.md 16, the finish review): a price column reads "Rp 95.000" as the panels and
 * the shop do, in either admin language, not a bare 95000. Display only — the field still holds
 * whole rupiah, and nothing here rounds. A server component for a field's
 * `admin.components.Cell`. `.jsx`: see `./leads/shared.jsx`'s header.
 */
import { formatRupiah } from './dashboard/format'

export function RupiahCell({ cellData }) {
  if (typeof cellData !== 'number') return null
  return <span className="ix-num">{formatRupiah(cellData)}</span>
}
