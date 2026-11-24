/**
 * The variant builder's arithmetic (TASKS.md 27.2.c; the plan's §3.2): options with values
 * ("Size: A4, A3"; "Frame: None, Wood") become every combination as a variant row — its label the
 * values joined ("A4 / None"), its SKU the product's SKU and each value's code ("PRT-1-A4-NONE"),
 * no price of its own (the product's applies) and on sale. Pure, so the builder and its tests
 * share it; the SKUs are still validated on the server, unique across every product (`skus.ts`).
 *
 * Options are not stored: a product keeps its variants, and the builder reads the options back from
 * their labels (`inferOptions`) when they split evenly on " / ".
 */
import { SKU_MAX_LENGTH } from '../../collections/products/skus'

export type OptionSet = { readonly name: string; readonly values: readonly string[] }

export type VariantRow = {
  readonly sku: string
  readonly label: string
  /** Whole rupiah, or null for the product's price. */
  readonly price: number | null
  readonly active: boolean
}

/** Between a label's values. */
export const LABEL_JOIN = ' / '

/** "A4, A3" (or one per line) as values: trimmed, blanks dropped, each once whatever its case. */
export function parseValues(text: string): string[] {
  const seen = new Set<string>()
  const values: string[] = []
  for (const raw of text.split(/[,\n]/)) {
    const value = raw.trim().replace(/\s+/g, ' ')
    const key = value.toLowerCase()
    if (value === '' || seen.has(key)) continue
    seen.add(key)
    values.push(value)
  }
  return values
}

/** Every combination of the options' values, the first option varying slowest. */
export function combinations(options: readonly OptionSet[]): string[][] {
  const used = options.filter((option) => option.values.length > 0)
  if (used.length === 0) return []
  return used.reduce<string[][]>(
    (acc, option) => acc.flatMap((combo) => option.values.map((value) => [...combo, value])),
    [[]],
  )
}

/** A value as a SKU part: upper case, letters and digits, other runs one hyphen ("Dark wood" → "DARK-WOOD"). */
export function skuPart(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** The product's SKU and the values' parts, within the SKU's length. */
export function variantSku(productSku: string, values: readonly string[]): string {
  const parts = values.map(skuPart).filter((part) => part !== '')
  const tail = parts.length > 0 ? `-${parts.join('-')}` : ''
  const head = productSku.trim().slice(0, Math.max(1, SKU_MAX_LENGTH - tail.length))
  return `${head}${tail}`.slice(0, SKU_MAX_LENGTH)
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * The rows for `options`: a combination already among `existing` (by label) keeps its SKU, price
 * and on-sale switch; a new one gets a generated SKU, made unique among the rows (`-2`, `-3`).
 * Rows whose combination is gone are left out.
 */
export function buildVariants(
  options: readonly OptionSet[],
  productSku: string,
  existing: readonly VariantRow[] = [],
): VariantRow[] {
  const rows: VariantRow[] = []
  const taken = new Set<string>()
  const combos = combinations(options)
  // The kept rows claim their SKUs first, so a new row never takes one of them.
  const kept = combos.map((values) => {
    const label = values.join(LABEL_JOIN)
    const found = existing.find((row) => same(row.label, label))
    if (found) taken.add(found.sku.toLowerCase())
    return { values, label, found }
  })
  for (const { values, label, found } of kept) {
    if (found) {
      rows.push({ ...found, label })
      continue
    }
    const base = variantSku(productSku, values)
    let sku = base
    for (let n = 2; taken.has(sku.toLowerCase()); n += 1) {
      const suffix = `-${n}`
      sku = `${base.slice(0, SKU_MAX_LENGTH - suffix.length)}${suffix}`
    }
    taken.add(sku.toLowerCase())
    rows.push({ sku, label, price: null, active: true })
  }
  return rows
}

/**
 * The options the labels were built from, when every label splits into the same number of values:
 * "A4 / None", "A4 / Wood", "A3 / None" → [A4, A3], [None, Wood], named "Option 1", "Option 2"
 * (`name`). Labels that do not split evenly come back as one option of whole labels.
 */
export function inferOptions(
  labels: readonly string[],
  name: (index: number) => string = (index) => `Option ${index + 1}`,
): OptionSet[] {
  const named = labels.map((label) => label.trim()).filter((label) => label !== '')
  if (named.length === 0) return []
  const split = named.map((label) => label.split(LABEL_JOIN).map((part) => part.trim()))
  const width = split[0]!.length
  if (!split.every((parts) => parts.length === width && parts.every((part) => part !== ''))) {
    return [{ name: name(0), values: parseValues(named.join(',')) }]
  }
  return Array.from({ length: width }, (_, index) => ({
    name: name(index),
    values: parseValues(split.map((parts) => parts[index]!).join(',')),
  }))
}
