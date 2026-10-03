'use client'

/**
 * The variant picker (6.1.b; EXPERIENCE-SHOP.md §4): each variant dimension is a real radio
 * group, the price updates to the chosen variant, and an option whose every variant is sold out
 * stays visible marked "Sold out" — never a silent grey. The prices arrive preformatted from the
 * server (the server formats, the client never computes); the button posts to the add-to-bag
 * placeholder, which 6.2's bag replaces.
 */
import { useState, useTransition } from 'react'

import type { SiteLocale } from '@engine/config/sites'

import { addToBagPlaceholder } from './actions'
import { productText } from './copy'
import styles from './product.module.css'

export type PickerVariant = {
  readonly sku: string
  readonly label: string
  /** The variant's price, formatted by the server; `null` takes the product's own. */
  readonly price: number | null
  readonly priceText: string | null
  readonly available: boolean
}

export type VariantPickerProps = {
  readonly sku: string
  readonly locale: SiteLocale
  readonly variants: readonly PickerVariant[]
  readonly productPriceText: string | null
  readonly available: boolean
}

export function VariantPicker({
  sku,
  locale,
  variants,
  productPriceText,
  available,
}: VariantPickerProps): React.ReactElement {
  const text = productText(locale)
  const [chosen, setChosen] = useState<string | null>(variants[0]?.sku ?? null)
  const [failed, setFailed] = useState(false)
  const [pending, startTransition] = useTransition()
  const chosenVariant = variants.find((variant) => variant.sku === chosen) ?? null
  const priceText = chosenVariant?.priceText ?? productPriceText
  const canAdd = available && (variants.length === 0 || (chosenVariant?.available ?? false))
  const fieldId = `variant-${sku}`

  const add = (): void => {
    setFailed(false)
    startTransition(async () => {
      const result = await addToBagPlaceholder({
        sku,
        variantSku: chosenVariant?.sku ?? null,
        qty: 1,
      })
      if (!result.ok) setFailed(true)
    })
  }

  return (
    <div className={styles.picker}>
      {variants.length > 0 && (
        <fieldset className={styles.options}>
          <legend className={styles.optionsLegend}>{text('product.options')}</legend>
          <div className={styles.optionList} role="radiogroup" aria-labelledby={fieldId}>
            {variants.map((variant) => (
              <label
                key={variant.sku}
                className={[
                  styles.option,
                  variant.sku === chosen ? styles.optionChosen : '',
                  !variant.available ? styles.optionSoldOut : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <input
                  id={fieldId}
                  type="radio"
                  name={`variant-${sku}`}
                  value={variant.sku}
                  checked={variant.sku === chosen}
                  onChange={() => setChosen(variant.sku)}
                  disabled={!variant.available}
                  className={styles.optionInput}
                />
                <span className={styles.optionLabel}>{variant.label}</span>
                {!variant.available && (
                  <span className={styles.optionState}>{text('product.optionSoldOut')}</span>
                )}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {priceText !== null && <p className={styles.price}>{priceText}</p>}

      <div className={styles.buyRow}>
        <button
          type="button"
          className={styles.addButton}
          onClick={add}
          disabled={!canAdd || pending}
          aria-busy={pending || undefined}
        >
          {canAdd ? text('product.addToBag') : text('product.outOfStock')}
        </button>
        <span className={styles.stock} aria-live="polite">
          {canAdd ? text('product.inStock') : text('product.outOfStock')}
        </span>
      </div>
      {failed && (
        <p className={styles.failed} role="status">
          {text('product.addingFailed')}
        </p>
      )}
    </div>
  )
}
