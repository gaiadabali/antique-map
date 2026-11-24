'use client'
/**
 * The variant builder's options (TASKS.md 27.2.c): an option's name and its values, separated by
 * commas ("Size" — "A4, A3"), as many options as needed, and "Make variants", which hands the
 * parsed options to `./variants-field.jsx`. The options live here only: the product keeps its
 * variants. `.jsx`: see `../leads/shared.jsx`'s header.
 */
import { L } from './copy'

export function VariantOptions({ options, onChange, onMake, language, disabled }) {
  function update(index, patch) {
    onChange(options.map((option, i) => (i === index ? { ...option, ...patch } : option)))
  }

  return (
    <fieldset className="pe-options">
      <legend className="pe-visually-hidden">{L('variantsLabel', language)}</legend>
      {options.map((option, index) => {
        const nameId = `pe-option-name-${index}`
        const valuesId = `pe-option-values-${index}`
        return (
          <div className="pe-option" key={index}>
            <div className="pe-option__name">
              <label className="pe-mini-label" htmlFor={nameId}>
                {`${L('optionName', language)} ${index + 1}`}
              </label>
              <input
                id={nameId}
                className="pe-input"
                value={option.name}
                placeholder={L('optionNamePlaceholder', language)}
                disabled={disabled}
                onChange={(event) => update(index, { name: event.target.value })}
              />
            </div>
            <div className="pe-option__values">
              <label className="pe-mini-label" htmlFor={valuesId}>
                {L('optionValues', language)}
              </label>
              <input
                id={valuesId}
                className="pe-input"
                value={option.text}
                placeholder={L('optionValuesPlaceholder', language)}
                disabled={disabled}
                onChange={(event) => update(index, { text: event.target.value })}
              />
            </div>
            {options.length > 1 ? (
              <button
                type="button"
                className="pe-btn pe-btn--quiet pe-option__remove"
                disabled={disabled}
                aria-label={`${L('removeOption', language)} ${index + 1}`}
                onClick={() => onChange(options.filter((_, i) => i !== index))}
              >
                {L('removeOption', language)}
              </button>
            ) : null}
          </div>
        )
      })}
      <div className="pe-actions">
        <button
          type="button"
          className="pe-btn pe-btn--quiet"
          disabled={disabled}
          onClick={() => onChange([...options, { name: '', text: '' }])}
        >
          {L('addOption', language)}
        </button>
        <button type="button" className="pe-btn" disabled={disabled} onClick={onMake}>
          {L('makeVariants', language)}
        </button>
      </div>
    </fieldset>
  )
}
