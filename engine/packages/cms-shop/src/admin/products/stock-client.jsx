'use client'
/**
 * The stores × variants stock table (TASKS.md 27.2.d; the plan's §3.2: "type the physical count
 * straight in"). A row per store — those already holding the product first, the rest found by
 * name or code — and a column per saved variant. A count saves when its box is left (or on Enter),
 * through `stock-levels` as the person (`./stock-grid` `stockRequest`): the server stores it less
 * the units held for open orders, and the cell then shows what can still be sold, with the held
 * units named. The checkout's atomic decrement is not involved.
 *
 * A store without a row for this product takes a count from the owner only — the collection's
 * `create` is theirs — and the box is read-only for anyone else. `.jsx`: see
 * `../leads/shared.jsx`'s header.
 */
import { useFormFields, useTranslation } from '@payloadcms/ui'
import { useMemo, useState } from 'react'

import { L } from './copy'
import { refusalOf } from './photos'
import {
  canStart,
  cellKey,
  heldBack,
  indexRows,
  parseCount,
  stockRequest,
  totalOf,
  visibleStores,
} from './stock-grid'
import './editor.css'

const SHOWN = 10

function StockCell({ store, column, row, productId, mayStart, language, onSaved }) {
  const [text, setText] = useState(row ? String(row.quantity) : '')
  const [state, setState] = useState({ phase: 'idle' })
  const editable = Boolean(row) || mayStart

  async function leave() {
    const count = parseCount(text)
    if (count === undefined || (row && count === row.quantity)) return
    if (count === null) {
      setState({ phase: 'error', reason: L('wholeNumber', language) })
      return
    }
    setState({ phase: 'saving' })
    const request = stockRequest({
      row,
      store: store.id,
      product: productId,
      variantSku: column.sku,
      count,
    })
    try {
      const response = await globalThis.fetch(request.url, {
        method: request.method,
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request.body),
      })
      const json = await response.json().catch(() => null)
      if (!response.ok || !json?.doc) {
        setState({ phase: 'error', reason: refusalOf(json, L('tryAgain', language)) })
        return
      }
      const quantity = Number(json.doc.quantity) || 0
      onSaved({ id: json.doc.id, store: store.id, variantSku: column.sku, quantity })
      setText(String(quantity))
      setState({ phase: 'saved', held: heldBack(count, quantity) })
    } catch {
      setState({ phase: 'error', reason: L('tryAgain', language) })
    }
  }

  return (
    <td className="pe-stock__cell">
      <input
        className="pe-input pe-input--num"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={`${store.name}, ${column.label}`}
        title={editable ? undefined : L('ownerAddsRow', language)}
        value={text}
        readOnly={!editable || state.phase === 'saving'}
        onChange={(event) => {
          setText(event.target.value)
          if (state.phase !== 'saving') setState({ phase: 'idle' })
        }}
        onKeyDown={(event) => {
          // Enter saves the count, never the whole product form.
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          }
        }}
        onBlur={() => void leave()}
      />
      <span className="pe-cell-status" role="status">
        {state.phase === 'saving' ? L('saving', language) : null}
        {state.phase === 'saved'
          ? state.held > 0
            ? L('held', language, { n: state.held })
            : L('saved', language)
          : null}
      </span>
      {state.phase === 'error' ? (
        <span className="pe-error" role="alert">
          {L('notSaved', language, { reason: state.reason })}
        </span>
      ) : null}
    </td>
  )
}

export function StockClient({ productId, role, stores, rows: initialRows, columns }) {
  const { i18n } = useTranslation()
  const language = i18n?.language
  const [rows, setRows] = useState(() => indexRows(initialRows ?? []))
  // The order is the page's as it opened: a store counted now does not jump up under the cursor.
  const [opened] = useState(() => indexRows(initialRows ?? []))
  const [query, setQuery] = useState('')
  const [all, setAll] = useState(false)
  const liveSkus = useFormFields(([state]) =>
    Object.entries(state ?? {})
      .filter(([path]) => /^variants\.\d+\.sku$/.test(path))
      .map(([, field]) => field?.value ?? '')
      .join('|'),
  )
  const savedSkus = columns
    .map((column) => column.sku ?? '')
    .filter(Boolean)
    .join('|')
  const unsaved = productId !== null && liveSkus !== savedSkus
  const mayStart = canStart(role)
  const shown = useMemo(
    () => visibleStores(stores, opened, query, { limit: SHOWN, all }),
    [stores, opened, query, all],
  )

  function saved(row) {
    setRows((current) => new Map(current).set(cellKey(row.store, row.variantSku), row))
  }

  return (
    <div className="pe-section field-type" id="field-stock">
      <span className="pe-label" id="pe-stock-label">
        {L('stockLabel', language)}
      </span>
      {productId === null ? (
        <p className="pe-notice">{L('stockSaveFirst', language)}</p>
      ) : (
        <>
          <p className="pe-help">{L('stockHelp', language)}</p>
          {unsaved ? <p className="pe-notice">{L('stockUnsavedVariants', language)}</p> : null}
          <label className="pe-mini-label" htmlFor="pe-stock-find">
            {L('findStore', language)}
          </label>
          <input
            id="pe-stock-find"
            className="pe-input pe-stock__find"
            type="search"
            value={query}
            placeholder={L('findStorePlaceholder', language)}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && event.preventDefault()}
          />
          {shown.stores.length === 0 ? (
            <p className="pe-help">{L('noStores', language)}</p>
          ) : (
            <div className="pe-scroll" role="region" aria-labelledby="pe-stock-label" tabIndex={0}>
              <table className="pe-table pe-stock">
                <thead>
                  <tr>
                    <th scope="col">{L('store', language)}</th>
                    {columns.map((column) => (
                      <th scope="col" key={column.sku ?? ''}>
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.stores.map((store) => (
                    <tr key={store.id}>
                      <th scope="row" className="pe-stock__store">
                        {store.name}
                        <span className="pe-code">{store.code}</span>
                      </th>
                      {columns.map((column) => (
                        <StockCell
                          key={cellKey(store.id, column.sku)}
                          store={store}
                          column={column}
                          row={rows.get(cellKey(store.id, column.sku))}
                          productId={productId}
                          mayStart={mayStart}
                          language={language}
                          onSaved={saved}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">{L('total', language)}</th>
                    {columns.map((column) => (
                      <td key={column.sku ?? ''} className="pe-num">
                        {totalOf(rows, column.sku)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          {!all && query.trim() === '' && shown.total > shown.stores.length ? (
            <button type="button" className="pe-btn pe-btn--quiet" onClick={() => setAll(true)}>
              {L('showAllStores', language, { n: shown.total })}
            </button>
          ) : null}
        </>
      )}
    </div>
  )
}
