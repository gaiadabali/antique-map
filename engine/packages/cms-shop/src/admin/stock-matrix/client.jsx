'use client'
/**
 * The products × stores table (TASKS.md 27.4.b; the plan's §3.8: "change the number straight in").
 * A row per line (a product, or one of its variants), a column per store the person may count at.
 * A count saves when its box is left or on Enter, through `stock-levels` as the person
 * (`../products/stock-grid` `stockRequest`, the product editor's own request): the server stores it
 * less the units held for open orders, and the box then shows what can still be sold, with the
 * held units named. The checkout's atomic decrement is not involved.
 *
 * A box for a store that does not stock the line takes a count from the owner only — the
 * collection's `create` is theirs; anyone else sees a dash. A count at or below the low-stock
 * threshold is marked "Low" in words, not by colour alone. One polite live region announces each
 * save, so a hundred columns do not mean a hundred live regions. `.jsx`: see
 * `../leads/shared.jsx`'s header.
 */
import { useState } from 'react'

import { refusalOf } from '../products/photos'
import { heldBack, parseCount, stockRequest } from '../products/stock-grid'
import { L } from './copy'
import { isLow, matrixKey } from './grid'
import './matrix.css'

async function save(request) {
  const response = await globalThis.fetch(request.url, {
    method: request.method,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request.body),
  })
  const json = await response.json().catch(() => null)
  return { ok: response.ok && Boolean(json?.doc), json }
}

function MatrixCell({ line, store, row, mayStart, threshold, language, onSaved, announce }) {
  const [text, setText] = useState(row ? String(row.quantity) : '')
  const [state, setState] = useState({ phase: 'idle' })
  const label = L('cellLabel', language, {
    product: line.variantLabel ? `${line.name}, ${line.variantLabel}` : line.name,
    store: store.name,
  })

  if (!row && !mayStart) {
    return (
      <td className="sm-cell sm-cell--none" title={L('ownerAddsRow', language)}>
        <span aria-hidden="true">—</span>
        <span className="sm-hidden">{`${label}: ${L('notStocked', language)}`}</span>
      </td>
    )
  }

  async function leave() {
    const count = parseCount(text)
    if (count === undefined || (row && count === row.quantity && state.phase !== 'error')) return
    if (count === null) {
      setState({ phase: 'error', reason: L('wholeNumber', language) })
      return
    }
    setState({ phase: 'saving' })
    const request = stockRequest({
      row,
      store: store.id,
      product: line.product,
      variantSku: line.variantSku,
      count,
    })
    try {
      const { ok, json } = await save(request)
      if (!ok) {
        const reason = refusalOf(json, L('tryAgain', language))
        setState({ phase: 'error', reason })
        announce(`${label}: ${L('notSaved', language, { reason })}`)
        return
      }
      const quantity = Number(json.doc.quantity) || 0
      const held = heldBack(count, quantity)
      onSaved({
        id: json.doc.id,
        store: store.id,
        product: line.product,
        variantSku: line.variantSku,
        quantity,
      })
      setText(String(quantity))
      setState({ phase: 'saved', held })
      announce(`${label}: ${held > 0 ? L('held', language, { n: held }) : L('saved', language)}`)
    } catch {
      setState({ phase: 'error', reason: L('tryAgain', language) })
    }
  }

  const low = row !== undefined && isLow(row.quantity, threshold)
  return (
    <td className={`sm-cell${low ? ' sm-cell--low' : ''}`}>
      <input
        className="ix-input sm-input"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label={label}
        data-sku={line.sku}
        data-store={store.code}
        value={text}
        readOnly={state.phase === 'saving'}
        onChange={(event) => {
          setText(event.target.value)
          if (state.phase !== 'saving') setState({ phase: 'idle' })
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          }
        }}
        onBlur={() => void leave()}
      />
      {low && state.phase !== 'saving' ? (
        <span className="sm-low">{L('low', language)}</span>
      ) : null}
      {state.phase === 'saving' ? <span className="sm-status">{L('saving', language)}</span> : null}
      {state.phase === 'saved' ? (
        <span className="sm-status">
          {state.held > 0 ? L('held', language, { n: state.held }) : L('saved', language)}
        </span>
      ) : null}
      {state.phase === 'error' ? (
        <span className="sm-error" role="alert">
          {L('notSaved', language, { reason: state.reason })}
        </span>
      ) : null}
    </td>
  )
}

export function StockMatrixClient({
  stores,
  lines,
  rows: initialRows,
  threshold,
  mayStart,
  language,
}) {
  const [rows, setRows] = useState(
    () =>
      new Map(initialRows.map((row) => [matrixKey(row.product, row.variantSku, row.store), row])),
  )
  const [message, setMessage] = useState('')

  function saved(row) {
    setRows((current) =>
      new Map(current).set(matrixKey(row.product, row.variantSku, row.store), row),
    )
  }

  return (
    <>
      <p className="sm-hidden" role="status" aria-live="polite">
        {message}
      </p>
      <div className="sm-scroll" role="region" aria-labelledby="sm-table-label" tabIndex={0}>
        <table className="ix-table sm-table">
          <caption id="sm-table-label" className="sm-hidden">
            {L('tableLabel', language)}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="sm-product">
                {L('product', language)}
              </th>
              {stores.map((store) => (
                <th scope="col" key={store.id} className="sm-store">
                  {store.name}
                  <span className="sm-code">{store.code}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.key}>
                <th scope="row" className="sm-product">
                  <a href={`/admin/collections/products/${line.product}`} className="sm-name">
                    {line.name}
                  </a>
                  {line.variantLabel ? (
                    <span className="sm-variant">{line.variantLabel}</span>
                  ) : null}
                  <span className="sm-code">{line.sku}</span>
                </th>
                {stores.map((store) => (
                  <MatrixCell
                    key={store.id}
                    line={line}
                    store={store}
                    row={rows.get(matrixKey(line.product, line.variantSku, store.id))}
                    mayStart={mayStart}
                    threshold={threshold}
                    language={language}
                    onSaved={saved}
                    announce={setMessage}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
