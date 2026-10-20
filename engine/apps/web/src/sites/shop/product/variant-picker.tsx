'use client'

/**
 * The variant picker (6.1.b, 6.1.c; the redesign of 2026-10-20, the handoff's King & McGaw option
 * rows): the price, then the options as one ruled row — "Option: chosen" with a "?" when the
 * options are the shop's finishes — whose choices are a real radio group drawn as chips (the chosen
 * one ringed); an option whose every variant is sold out stays visible marked "Sold out", never a
 * silent grey. Then the 60 px Add to bag, which on a phone sits in a white bar fixed to the foot of
 * the screen from the first paint, and the stock line. The prices arrive preformatted from the
 * server (the server formats, the client never computes); the button posts to the real bag's
 * `addToBagAction`, which refuses an out-of-stock product or variant on the server.
 */
import { useActionState, useState } from 'react'

import { TextLink } from '../../../shared/ui'
import { addToBagAction } from '../../../server/shop/bag/actions'
import type { VariantPickerText } from './copy'
import styles from './picker.module.css'

export type PickerVariant = {
  readonly sku: string
  readonly label: string
  /** The variant's price, formatted by the server; `null` takes the product's own. */
  readonly price: number | null
  readonly priceText: string | null
  readonly available: boolean
}

export type VariantPickerProps = {
  readonly productId: number
  readonly sku: string
  /** The picker's words, resolved by the server: a client never imports the lexicon files. */
  readonly text: VariantPickerText
  readonly variants: readonly PickerVariant[]
  readonly productPriceText: string | null
  readonly available: boolean
  readonly bagHref: string
}

export function VariantPicker({
  productId,
  sku,
  text,
  variants,
  productPriceText,
  available,
  bagHref,
}: VariantPickerProps): React.ReactElement {
  const [chosen, setChosen] = useState<string | null>(variants[0]?.sku ?? null)
  const [state, add, pending] = useActionState(addToBagAction, null)
  const chosenVariant = variants.find((variant) => variant.sku === chosen) ?? null
  const priceText = chosenVariant?.priceText ?? productPriceText
  const canAdd = available && (variants.length === 0 || (chosenVariant?.available ?? false))
  const legendId = `variant-${sku}-legend`
  const added = state?.outcome === 'added' || state?.outcome === 'updated'
  const message =
    state === null
      ? null
      : added
        ? text.added
        : state.outcome === 'capped'
          ? text.capped
          : state.outcome === 'refused'
            ? text.refused
            : text.addingFailed

  return (
    <form className={styles.picker} action={add}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="qty" value={1} />
      {priceText !== null && <p className={styles.price}>{priceText}</p>}

      {variants.length > 0 && (
        <div className={styles.options}>
          <div className={styles.optionRow}>
            <span id={legendId} className={styles.legend}>
              {text.optionLabel}: <span className={styles.chosen}>{chosenVariant?.label}</span>
            </span>
            {text.help !== null && (
              <details className={styles.help}>
                <summary aria-label={text.help.label}>?</summary>
                <p>{text.help.text}</p>
              </details>
            )}
          </div>
          <div className={styles.optionList} role="radiogroup" aria-labelledby={legendId}>
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
                  type="radio"
                  name="variantSku"
                  value={variant.sku}
                  checked={variant.sku === chosen}
                  onChange={() => setChosen(variant.sku)}
                  disabled={!variant.available}
                  className={styles.optionInput}
                />
                <span className={styles.optionLabel}>{variant.label}</span>
                {!variant.available && (
                  <span className={styles.optionState}>{text.optionSoldOut}</span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* `data-chat-clear`: the floating chat button rises above this bar on a phone. */}
      <div className={styles.buyBar} data-chat-clear>
        <button
          type="submit"
          // `addButton` last: the e2e suite finds a sold-out product by its class ending the list.
          className={[styles.add, canAdd ? '' : styles.addSoldOut, styles.addButton]
            .filter(Boolean)
            .join(' ')}
          disabled={!canAdd || pending}
          aria-busy={pending || undefined}
        >
          {added && canAdd ? (
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="m3 8.5 3 3 7-7" />
            </svg>
          ) : null}
          {canAdd ? text.addToBag : text.outOfStock}
        </button>
      </div>
      <p className={styles.stock} aria-live="polite">
        {canAdd ? text.inStock : text.outOfStock}
      </p>
      {message !== null && (
        <p className={styles.status} role="status" aria-live="polite">
          {message}
          {added && (
            <>
              {' '}
              <TextLink href={bagHref}>{text.viewBag}</TextLink>
            </>
          )}
        </p>
      )}
    </form>
  )
}
