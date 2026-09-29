// The fixture money walk (TASKS.md 2.2.l; senior-be review 2.4, S9 and F3). No type can hold
// "an amount is an integer" or "an estimate is a whole major unit", so this walks a fixture's
// whole object graph at run time and checks every C5 `Money` and `PriceSet` it finds.
//
// Detection is structural and traces to `@engine/domain/money` (C5), never to a field name:
// - a `Money` is an object whose own keys are exactly C5's two, `amount` and `currency`;
// - a `PriceSet` is an object whose own keys are exactly C5's four, `charge`, `taxIncluded`,
//   `basis` and `estimate` (`PriceBase` plus the discriminated union's two).
// The key lists below are typed against C5, so a field added to or dropped from the contract
// fails to compile here before a walk could silently stop recognising the shape.
import { CURRENCY_EXPONENT, type CurrencyCode } from '@engine/config/schema'
import type { Money, PriceSet } from '@engine/domain/money'

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Assert<T extends true> = T

// Sorted, because `hasExactKeys` compares against sorted own keys.
const MONEY_KEYS = ['amount', 'currency'] as const
const PRICE_SET_KEYS = ['basis', 'charge', 'estimate', 'taxIncluded'] as const
const BASES = ['sole-currency', 'market-currency', 'converted'] as const
type _MoneyKeysAreC5s = Assert<Equals<(typeof MONEY_KEYS)[number], keyof Money>>
type _PriceSetKeysAreC5s = Assert<Equals<(typeof PRICE_SET_KEYS)[number], keyof PriceSet>>
type _BasesAreC5s = Assert<Equals<(typeof BASES)[number], PriceSet['basis']>>

export type WalkReport = {
  /** Every place a `Money` sits in the graph — a shared object reached twice counts twice. */
  money: number
  /** Distinct `Money` objects, however many places reach them. */
  distinctMoney: number
  priceSets: number
  distinctPriceSets: number
  /** `converted` price sets whose estimate was checked for a whole major unit. */
  convertedEstimates: number
  /** `sole-currency` price sets by charge currency — observed, not asserted (C5 fixes none). */
  soleCurrencyCharges: Partial<Record<string, number>>
  /** `path: what is wrong`, one per broken value. */
  violations: string[]
}

const hasExactKeys = (value: object, keys: readonly string[]): boolean => {
  const own = Object.keys(value).sort()
  return own.length === keys.length && own.every((key, i) => key === keys[i])
}

const isCurrency = (code: unknown): code is CurrencyCode =>
  typeof code === 'string' && Object.hasOwn(CURRENCY_EXPONENT, code)

const isMoneyShape = (value: object): value is { amount: unknown; currency: unknown } =>
  hasExactKeys(value, MONEY_KEYS)

const isPriceSetShape = (
  value: object,
): value is Record<(typeof PRICE_SET_KEYS)[number], unknown> => hasExactKeys(value, PRICE_SET_KEYS)

/** C5 `Money`: a safe, non-negative integer of minor units in a currency the engine knows. */
function moneyViolation(money: { amount: unknown; currency: unknown }): string | null {
  if (!isCurrency(money.currency)) return `currency ${String(money.currency)} is not a CurrencyCode`
  if (typeof money.amount !== 'number' || !Number.isSafeInteger(money.amount)) {
    return `amount ${String(money.amount)} ${money.currency} is not a safe integer of minor units`
  }
  if (money.amount < 0) return `amount ${money.amount} ${money.currency} is negative`
  return null
}

/**
 * C5 `PriceSet`: `converted` carries an estimate, rounded at `fx-conversion` to a WHOLE major
 * unit (`amount` a multiple of 10^CURRENCY_EXPONENT); the other two bases carry none.
 */
function priceSetViolation(set: Record<(typeof PRICE_SET_KEYS)[number], unknown>): string | null {
  if (!BASES.some((basis) => basis === set.basis)) return `basis ${String(set.basis)} is not C5's`
  if (typeof set.taxIncluded !== 'boolean') return 'taxIncluded is not a boolean'
  if (typeof set.charge !== 'object' || set.charge === null || !isMoneyShape(set.charge)) {
    return 'charge is not a Money'
  }
  if (set.basis !== 'converted') {
    return set.estimate === null ? null : `a ${String(set.basis)} price carries an estimate`
  }
  const estimate = set.estimate
  if (typeof estimate !== 'object' || estimate === null || !isMoneyShape(estimate)) {
    return 'a converted price carries no Money estimate'
  }
  // The estimate's own Money check (integer, known currency) runs when the walk reaches it.
  if (!isCurrency(estimate.currency) || typeof estimate.amount !== 'number') return null
  const major = 10 ** CURRENCY_EXPONENT[estimate.currency]
  if (estimate.amount % major !== 0) {
    const shown = (estimate.amount / major).toFixed(CURRENCY_EXPONENT[estimate.currency])
    return `estimate ${shown} ${estimate.currency} (${estimate.amount} minor) is not a whole major unit`
  }
  return null
}

const isPlainObject = (value: object): boolean => {
  const proto: unknown = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * Walks `root` depth-first — plain objects, arrays, and a `Streamed` part (C2: a `Promise`) by
 * awaiting it — and checks every Money and PriceSet on the way. A pending part's timer must have
 * fired before the walk (the test runs the fixtures on fake timers), or the walk waits for it.
 */
export async function walkMoney(root: unknown, rootPath = '$'): Promise<WalkReport> {
  const report: WalkReport = {
    money: 0,
    distinctMoney: 0,
    priceSets: 0,
    distinctPriceSets: 0,
    convertedEstimates: 0,
    soleCurrencyCharges: {},
    violations: [],
  }
  const seenMoney = new Set<object>()
  const seenPriceSets = new Set<object>()
  const ancestors = new Set<object>()

  async function visit(value: unknown, path: string): Promise<void> {
    if (value instanceof Promise) return visit(await value, `${path}<resolved>`)
    if (typeof value !== 'object' || value === null || ancestors.has(value)) return
    if (!Array.isArray(value) && !isPlainObject(value)) return
    if (!Array.isArray(value) && isMoneyShape(value)) {
      report.money += 1
      if (!seenMoney.has(value)) report.distinctMoney += 1
      seenMoney.add(value)
      const wrong = moneyViolation(value)
      if (wrong) report.violations.push(`${path}: ${wrong}`)
      return
    }
    if (!Array.isArray(value) && isPriceSetShape(value)) {
      report.priceSets += 1
      if (!seenPriceSets.has(value)) report.distinctPriceSets += 1
      seenPriceSets.add(value)
      const wrong = priceSetViolation(value)
      if (wrong) report.violations.push(`${path}: ${wrong}`)
      if (value.basis === 'converted') report.convertedEstimates += 1
      if (value.basis === 'sole-currency' && typeof value.charge === 'object' && value.charge) {
        const code = String((value.charge as { currency?: unknown }).currency)
        report.soleCurrencyCharges[code] = (report.soleCurrencyCharges[code] ?? 0) + 1
      }
    }
    ancestors.add(value)
    const entries = Array.isArray(value)
      ? value.map((item, i) => [`[${i}]`, item] as const)
      : Object.entries(value).map(([key, item]) => [`.${key}`, item] as const)
    for (const [step, item] of entries) await visit(item, `${path}${step}`)
    ancestors.delete(value)
  }

  await visit(root, rootPath)
  return report
}

/** Throws a readable list of every broken value, so a planted fixture's failure is provable. */
export async function assertFixtureMoney(root: unknown, rootPath = '$'): Promise<WalkReport> {
  const report = await walkMoney(root, rootPath)
  if (report.violations.length > 0) {
    throw new Error(`fixture money broken:\n${report.violations.join('\n')}`)
  }
  return report
}
