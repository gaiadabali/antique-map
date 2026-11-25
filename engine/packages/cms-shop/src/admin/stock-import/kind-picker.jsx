'use client'
/**
 * What the file holds (TASKS.md 27.4.c): stock counts, products or stores, as three radio buttons,
 * and the chosen kind's template columns — the header row the importer checks (`../../import/kinds`,
 * CONTENT-MODEL.md §9) — with one line on how its rows land. `.jsx`: see `../leads/shared.jsx`'s
 * header.
 */
import {
  PRODUCT_COLUMNS,
  STOCK_COLUMNS,
  STORE_COLUMNS,
  STORE_OPTIONAL_COLUMNS,
} from '@engine/cms-core/import/kinds'

import { L } from './copy'

export const KINDS = [
  { kind: 'stock', label: 'kindStock', note: 'noteStock', columns: STOCK_COLUMNS },
  { kind: 'products', label: 'kindProducts', note: 'noteProducts', columns: PRODUCT_COLUMNS },
  {
    kind: 'stores',
    label: 'kindStores',
    note: 'noteStores',
    columns: STORE_COLUMNS,
    optional: STORE_OPTIONAL_COLUMNS,
  },
]

export function KindPicker({ kind, onChange, disabled, language }) {
  const chosen = KINDS.find((each) => each.kind === kind) ?? KINDS[0]
  return (
    <fieldset className="si-kinds" disabled={disabled}>
      <legend className="ix-label">{L('kindLegend', language)}</legend>
      <div className="si-kinds__options">
        {KINDS.map((each) => (
          <label key={each.kind} className="si-kind">
            <input
              type="radio"
              name="import-kind"
              value={each.kind}
              className="ix-check"
              checked={kind === each.kind}
              onChange={() => onChange(each.kind)}
            />
            {L(each.label, language)}
          </label>
        ))}
      </div>
      <p className="ix-muted si-note">{L(chosen.note, language)}</p>
      <p className="ix-muted si-note">
        {L('columnsLabel', language)}{' '}
        <code className="si-columns">{chosen.columns.join(', ')}</code>
      </p>
      {chosen.optional ? (
        <p className="ix-muted si-note">
          {L('optionalColumnsLabel', language)}{' '}
          <code className="si-columns">{chosen.optional.join(', ')}</code>
        </p>
      ) : null}
    </fieldset>
  )
}
