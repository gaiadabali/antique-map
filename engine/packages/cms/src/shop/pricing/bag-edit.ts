/**
 * Changing the bag (TASKS.md 6.2.a): pure functions the bag page's server actions call between
 * `parseBag` and `serialiseBag`. Each returns a new bag and what happened, so the page can say
 * "You can have at most 10 of one item" instead of silently changing a quantity.
 */
import { MAX_BAG_LINES, MAX_LINE_QTY, bagLineKey, parseBagLine, type BagLine } from './bag'

export type BagEdit =
  | { readonly outcome: 'added' | 'updated' | 'removed' | 'unchanged'; readonly lines: BagLine[] }
  /** The line now holds `MAX_LINE_QTY`; the rest was not added. */
  | { readonly outcome: 'capped'; readonly lines: BagLine[] }
  /** The bag already holds `MAX_BAG_LINES` other lines; nothing was added. */
  | { readonly outcome: 'full'; readonly lines: BagLine[] }
  /** The request was not a valid line (a missing id, a quantity out of range); nothing changed. */
  | { readonly outcome: 'invalid'; readonly lines: BagLine[] }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Adds `input` (untrusted: a form post) to the bag, merging with the same product and variant. */
export function addToBag(lines: readonly BagLine[], input: unknown): BagEdit {
  const line = parseBagLine(input)
  if (line === null) return { outcome: 'invalid', lines: [...lines] }
  const key = bagLineKey(line)
  const index = lines.findIndex((existing) => bagLineKey(existing) === key)
  if (index === -1) {
    if (lines.length >= MAX_BAG_LINES) return { outcome: 'full', lines: [...lines] }
    return { outcome: 'added', lines: [...lines, line] }
  }
  const current = lines[index] as BagLine
  const qty = Math.min(current.qty + line.qty, MAX_LINE_QTY)
  const next = lines.map((existing, i) => (i === index ? { ...existing, qty } : existing))
  return { outcome: current.qty + line.qty > MAX_LINE_QTY ? 'capped' : 'updated', lines: next }
}

/**
 * Sets a line's quantity (untrusted `input`: `{ productId, variantSku, qty }`). A quantity of 0
 * removes the line; a line not in the bag is left out — this never adds.
 */
export function setBagLineQty(lines: readonly BagLine[], input: unknown): BagEdit {
  const qty = isRecord(input) ? input.qty : undefined
  if (qty === 0 || qty === '0') return removeFromBag(lines, input)
  const line = parseBagLine(input)
  if (line === null) return { outcome: 'invalid', lines: [...lines] }
  const key = bagLineKey(line)
  if (!lines.some((existing) => bagLineKey(existing) === key)) {
    return { outcome: 'unchanged', lines: [...lines] }
  }
  return {
    outcome: 'updated',
    lines: lines.map((existing) =>
      bagLineKey(existing) === key ? { ...existing, qty: line.qty } : existing,
    ),
  }
}

/** Removes the line for `input`'s product and variant (`qty` is ignored). */
export function removeFromBag(lines: readonly BagLine[], input: unknown): BagEdit {
  const line = parseBagLine(isRecord(input) ? { ...input, qty: 1 } : input)
  if (line === null) return { outcome: 'invalid', lines: [...lines] }
  const key = bagLineKey(line)
  const next = lines.filter((existing) => bagLineKey(existing) !== key)
  return { outcome: next.length === lines.length ? 'unchanged' : 'removed', lines: next }
}
