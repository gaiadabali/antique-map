/**
 * The database's guards for discount codes (COMMERCE.md §2, §5), through the constraint seam —
 * what a wrong row would cost money on, held for the checkout's atomic `used_count` increment, a
 * seed and raw SQL alike:
 *
 * - **`discounts_code_normalised`** — upper-case, trimmed, not empty: the code's unique index then
 *   makes matching case-insensitive.
 * - **`discounts_value_valid`** — whole, above zero, and at most 100 for a percent.
 * - **`discounts_min_spend_whole`** — whole rupiah, zero or more, when set.
 * - **`discounts_usage_counted`** — `used_count` whole and never below zero; a limit, when set,
 *   whole, at least one, and never exceeded (the increment's `WHERE used_count < usage_limit`).
 * - **`discounts_window_ordered`** — the code ends after it starts, when both are set.
 */
import type { ConstraintSet } from '../../db/constraints'
import { wholeCheck } from '../products/money'

export const DISCOUNT_CONSTRAINTS: readonly ConstraintSet[] = [
  {
    table: 'discounts',
    checks: {
      discounts_code_normalised: `code = upper(btrim(code)) AND code <> ''`,
      discounts_value_valid: `${wholeCheck('value', 1, { nullable: false })} AND (kind <> 'percent' OR value <= 100)`,
      discounts_min_spend_whole: wholeCheck('min_spend', 0),
      discounts_usage_counted: `${wholeCheck('used_count', 0, { nullable: false })} AND (usage_limit IS NULL OR (usage_limit >= 1 AND usage_limit = trunc(usage_limit) AND used_count <= usage_limit))`,
      discounts_window_ordered: 'starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at',
    },
  },
]
