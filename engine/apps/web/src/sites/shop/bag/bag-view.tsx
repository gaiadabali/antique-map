/**
 * The bag page (6.2; EXPERIENCE-SHOP.md §5): server-rendered lines and totals, a quantity stepper
 * and remove per line, the welcome-code field, and a checkout CTA that stays inert until the bag
 * holds something to buy. Every figure arrived computed by the server (`../server/shop/bag`);
 * delivery says it is calculated at checkout — the bag page has no pin. Links never prefetch and
 * the styles are tokens only (DESIGN-SYSTEM.md).
 */
import type { SiteLocale } from '@engine/config/sites'

import type { BagVM } from '../../../server/shop/bag'
import { createHref, SITES } from '@engine/config/sites'
import { Button } from '../../../shared/ui'
import { bagText } from './copy'
import styles from './bag.module.css'
import { CodeForm } from './code-form'
import { QtyForm } from './qty-form'

const QTY_MIN = 1
const QTY_MAX = 10
const CODE_PROBLEM_KEYS = [
  'codeInvalid.unknown',
  'codeInvalid.expired',
  'codeInvalid.not-started',
  'codeInvalid.usage-limit',
  'codeInvalid.already-used',
  'codeInvalid.minimum-spend',
] as const

export type BagViewProps = {
  readonly bag: BagVM
  readonly locale: SiteLocale
}

export function BagView({ bag, locale }: BagViewProps): React.ReactElement {
  const text = bagText(locale)
  const href = createHref(SITES.shop)
  const codeVM = bag.code ?? undefined
  const problemTexts = Object.fromEntries(
    CODE_PROBLEM_KEYS.map((key) => [
      key,
      key === 'codeInvalid.minimum-spend' && codeVM?.problem?.amountText !== undefined
        ? text.shared(key, { amount: codeVM.problem.amountText })
        : text.shared(key),
    ]),
  )
  return (
    <section className={styles.bag} aria-labelledby="bag-title">
      <h1 id="bag-title" className={styles.title}>
        {text.shared('cart.title')}
      </h1>

      {bag.lines.length === 0 ? (
        <div className={styles.empty}>
          <p>{text.shared('cart.empty')}</p>
          <a href={href('browse', {}, locale)}>{text.shared('cart.emptyAction')}</a>
        </div>
      ) : (
        <div className={styles.columns}>
          <ul className={styles.lines}>
            {bag.lines.map((line) => (
              <li key={`${line.productId}-${line.variantSku ?? ''}`} className={styles.line}>
                {line.imageUrl !== null && (
                  <img className={styles.thumb} src={line.imageUrl} alt={line.imageAlt ?? ''} />
                )}
                <div className={styles.lineBody}>
                  <p className={styles.name}>
                    {line.slug !== null ? (
                      <a
                        href={href('product', { slug: line.slug }, locale)}
                        className={styles.nameLink}
                      >
                        {line.name}
                      </a>
                    ) : (
                      line.name
                    )}
                  </p>
                  {line.variantLabel !== null && (
                    <p className={styles.variant}>{line.variantLabel}</p>
                  )}
                  {line.status === 'ok' ? (
                    <p className={styles.unit}>{line.unitText}</p>
                  ) : (
                    <p className={styles.lineProblem} role="status">
                      {line.status === 'out_of_stock'
                        ? text('bag.lineOutOfStock')
                        : text('bag.lineUnavailable')}
                    </p>
                  )}
                  <QtyForm
                    productId={line.productId}
                    variantSku={line.variantSku}
                    qty={line.qty}
                    min={QTY_MIN}
                    max={QTY_MAX}
                    label={text.shared('cart.quantity')}
                    updateLabel={text('bag.update')}
                    removeLabel={text.shared('cart.remove', { title: line.name })}
                    rangeMessage={text('bag.qtyRange', { min: QTY_MIN, max: QTY_MAX })}
                    cappedMessage={text('bag.qtyCapped', { max: QTY_MAX })}
                  />
                </div>
                {line.lineText !== null && <p className={styles.lineTotal}>{line.lineText}</p>}
              </li>
            ))}
          </ul>

          {/* The bag's summary, not a landmark: it sits inside the bag's own named region. */}
          <div className={styles.summary}>
            {bag.freeDeliveryRemainingText !== null &&
              (bag.freeDeliveryRemainingText === 'Rp 0' || bag.isFreeDelivery ? (
                <p className={styles.freeReached}>{text.shared('cart.freeShippingReached')}</p>
              ) : (
                <p className={styles.freeRemaining}>
                  {text.shared('cart.freeShippingRemaining', {
                    amount: bag.freeDeliveryRemainingText,
                  })}
                </p>
              ))}

            <CodeForm
              label={text.shared('cart.codeLabel')}
              applyLabel={text.shared('cart.codeApply')}
              appliedCode={codeVM?.code ?? null}
              problem={
                codeVM === undefined || codeVM.problem === null
                  ? null
                  : (problemTexts[codeVM.problem.key] ?? null)
              }
              appliedMessage={
                codeVM === undefined ? null : text('bag.codeApplied', { code: codeVM.code })
              }
              problemTexts={problemTexts}
              unknownMessage={text.shared('codeInvalid.unknown')}
              clearMessage={text('bag.codeCleared')}
            />

            <p className={styles.deliveryNote}>{text('bag.deliveryAtCheckout')}</p>

            <dl className={styles.totals}>
              <div className={styles.totalRow}>
                <dt>{text('bag.subtotal')}</dt>
                <dd>{bag.subtotalText}</dd>
              </div>
              {codeVM?.discountText != null && (
                <div className={styles.totalRow}>
                  <dt>{text('bag.discount', { code: codeVM.code })}</dt>
                  <dd>−{codeVM.discountText}</dd>
                </div>
              )}
              <div className={[styles.totalRow, styles.grand].filter(Boolean).join(' ')}>
                <dt>{text('bag.total')}</dt>
                <dd>{bag.totalText}</dd>
              </div>
            </dl>

            {bag.refusal !== null && (
              <p className={styles.refusal} role="status">
                {bag.refusal.key === 'cart.empty'
                  ? text.shared('cart.empty')
                  : bag.refusal.key === 'bag.bagProblem'
                    ? text('bag.bagProblem')
                    : bag.refusal.key === 'bag.beyondReach'
                      ? text('bag.beyondReach')
                      : text('bag.deliveryUnavailable')}
              </p>
            )}

            <div className={styles.checkout}>
              {bag.canCheckout ? (
                // An <a>, so the checkout address is a real link (and nothing prefetches it).
                <Button variant="primary" href={href('checkout', {}, locale)}>
                  {text.shared('cart.checkout')}
                </Button>
              ) : (
                <Button variant="primary" disabled>
                  {text.shared('cart.checkout')}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
