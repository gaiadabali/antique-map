'use client'
/**
 * The product's variants (TASKS.md 27.2.c; the plan's §3.2): the options builder
 * (`./variant-options.jsx`) above the variants as a table — label, SKU, price, on sale. "Make
 * variants" replaces the `variants` array's rows with every combination (`./variants`
 * `buildVariants`): a combination already there keeps its row, SKU and price. Each cell edits the
 * form's own value, so saving, the SKU rules (unique across every product, `skus.ts`) and whole
 * rupiah (`money.ts`) are the server's, and their messages show under the cell.
 * `.jsx`: see `../leads/shared.jsx`'s header.
 */
import { useDocumentInfo, useField, useForm, useFormFields, useTranslation } from '@payloadcms/ui'
import { useState } from 'react'

import { L } from './copy'
import { VariantOptions } from './variant-options'
import { buildVariants, inferOptions, parseValues } from './variants'
import './editor.css'

const SUBFIELDS = ['sku', 'label', 'price', 'active']

function stateOf(value) {
  return { initialValue: undefined, valid: true, value }
}

function Problem({ state }) {
  if (!state || state.valid !== false || !state.errorMessage) return null
  return (
    <span className="pe-error" role="alert">
      {state.errorMessage}
    </span>
  )
}

export function ProductVariantsField({ path = 'variants', readOnly }) {
  const { rows = [], errorMessage, showError } = useField({ path, hasRows: true })
  const { addFieldRow, removeFieldRow, dispatchFields, setModified } = useForm()
  const fields = useFormFields(([state]) => state)
  const { docPermissions } = useDocumentInfo()
  const { i18n } = useTranslation()
  const language = i18n?.language
  const locked = readOnly || docPermissions?.update === false
  const productSku = typeof fields?.sku?.value === 'string' ? fields.sku.value.trim() : ''
  const cell = (index, name) => fields?.[`${path}.${index}.${name}`]
  const variants = rows.map((row, index) => ({
    rowId: row.id,
    sku: cell(index, 'sku')?.value ?? '',
    label: cell(index, 'label')?.value ?? '',
    price: cell(index, 'price')?.value ?? null,
    active: cell(index, 'active')?.value !== false,
  }))
  const [options, setOptions] = useState(() => {
    const found = inferOptions(
      variants.map((variant) => variant.label),
      (index) => `${L('optionName', language)} ${index + 1}`,
    )
    return found.length > 0
      ? found.map((option) => ({ name: option.name, text: option.values.join(', ') }))
      : [{ name: '', text: '' }]
  })
  const [problem, setProblem] = useState(null)

  function set(index, name, value) {
    dispatchFields({ type: 'UPDATE', path: `${path}.${index}.${name}`, value })
    setModified(true)
  }

  function make() {
    if (productSku === '') {
      setProblem(L('skuFirst', language))
      return
    }
    setProblem(null)
    const parsed = options.map((option) => ({
      name: option.name,
      values: parseValues(option.text),
    }))
    const next = buildVariants(parsed, productSku, variants)
    for (let index = rows.length - 1; index >= 0; index -= 1)
      removeFieldRow({ path, rowIndex: index })
    // Each row at its index: the form reads its row count once per render, so rows added in one
    // go without one would all land first, in reverse.
    for (const [rowIndex, row] of next.entries()) {
      const kept = variants.find((variant) => variant.sku === row.sku && variant.rowId)
      addFieldRow({
        path,
        rowIndex,
        schemaPath: path,
        subFieldState: {
          ...(kept ? { id: stateOf(kept.rowId) } : {}),
          ...Object.fromEntries(SUBFIELDS.map((name) => [name, stateOf(row[name])])),
        },
      })
    }
  }

  return (
    <div className="pe-section field-type" id={`field-${path}`}>
      <span className="pe-label" id="pe-variants-label">
        {L('variantsLabel', language)}
      </span>
      <p className="pe-help">{L('variantsHelp', language)}</p>
      {locked ? null : (
        <VariantOptions
          options={options}
          onChange={setOptions}
          onMake={make}
          language={language}
          disabled={locked}
        />
      )}
      {problem ? (
        <p className="pe-error" role="alert">
          {problem}
        </p>
      ) : null}
      {showError && errorMessage ? (
        <p className="pe-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {variants.length === 0 ? (
        <p className="pe-help">{L('noVariants', language)}</p>
      ) : (
        <div className="pe-scroll" role="region" aria-labelledby="pe-variants-label" tabIndex={0}>
          <table className="pe-table">
            <thead>
              <tr>
                <th scope="col">{L('variantLabel', language)}</th>
                <th scope="col">{L('variantSku', language)}</th>
                <th scope="col">{L('variantPrice', language)}</th>
                <th scope="col">{L('onSale', language)}</th>
                <th scope="col">
                  <span className="pe-visually-hidden">{L('removeVariant', language)}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant, index) => {
                const name = variant.label || variant.sku || String(index + 1)
                return (
                  <tr key={variant.rowId ?? index}>
                    <td>
                      <input
                        id={`field-${path}__${index}__label`}
                        className="pe-input"
                        aria-label={`${L('variantLabel', language)} ${index + 1}`}
                        value={variant.label ?? ''}
                        readOnly={locked}
                        onChange={(event) => set(index, 'label', event.target.value)}
                      />
                      <Problem state={cell(index, 'label')} />
                    </td>
                    <td>
                      <input
                        id={`field-${path}__${index}__sku`}
                        className="pe-input pe-input--code"
                        aria-label={`${L('variantSku', language)}: ${name}`}
                        value={variant.sku ?? ''}
                        readOnly={locked}
                        onChange={(event) => set(index, 'sku', event.target.value)}
                      />
                      <Problem state={cell(index, 'sku')} />
                    </td>
                    <td>
                      <input
                        id={`field-${path}__${index}__price`}
                        className="pe-input pe-input--num"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        aria-label={`${L('variantPrice', language)}: ${name}`}
                        placeholder={L('variantPriceHint', language)}
                        value={variant.price ?? ''}
                        readOnly={locked}
                        onChange={(event) =>
                          set(
                            index,
                            'price',
                            event.target.value === '' ? null : Number(event.target.value),
                          )
                        }
                      />
                      <Problem state={cell(index, 'price')} />
                    </td>
                    <td className="pe-table__center">
                      <input
                        id={`field-${path}__${index}__active`}
                        className="pe-check"
                        type="checkbox"
                        aria-label={`${L('onSale', language)}: ${name}`}
                        checked={variant.active}
                        disabled={locked}
                        onChange={(event) => set(index, 'active', event.target.checked)}
                      />
                    </td>
                    <td>
                      {locked ? null : (
                        <button
                          type="button"
                          className="pe-btn pe-btn--quiet"
                          aria-label={`${L('removeVariant', language)}: ${name}`}
                          onClick={() => removeFieldRow({ path, rowIndex: index })}
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {locked ? null : (
        <button
          type="button"
          className="pe-btn pe-btn--quiet"
          onClick={() =>
            addFieldRow({
              path,
              rowIndex: rows.length,
              schemaPath: path,
              subFieldState: { active: stateOf(true) },
            })
          }
        >
          {L('addVariant', language)}
        </button>
      )}
    </div>
  )
}
