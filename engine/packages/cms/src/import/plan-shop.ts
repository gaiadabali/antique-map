/**
 * The shop row plans (CONTENT-MODEL.md §9): products (a product row and one per variant, the
 * variant's `parent_sku` naming it), stores, stock (the raw cells — the store and product are
 * resolved against the database in `./apply`) and discounts. Only the cells the row carries go
 * into the data: an empty cell never clears a field.
 */
import type { Problem } from './types'
import { SKU_PATTERN } from '../collections/products/skus'
import { optionProblem, pickOption, type PlannedRow, type Row, planned, refused } from './plan'
import type { Vocabulary } from './vocabulary'
import { yesNo } from './cells'

const clean = (raw: string | undefined) => (raw ?? '').trim()

const nonEmpty = (row: Row, column: string, value: string): Problem | null =>
  value === '' ? { column, problem: `${column} is empty. It is required.` } : null

/** A number cell as a whole number, or the plain problem. */
function number_(
  row: Row,
  column: string,
  raw: string,
  min: number,
  what: string,
): number | undefined {
  if (raw === '') return undefined
  const digits = raw.replace(/[.,](?=\d{3}\b)/g, '')
  if (/^\d+$/.test(digits)) {
    const value = Number(digits)
    if (value >= min) return value
    problems(row, column, `${column} is ${value}, but ${what} is ${min} or more.`)
    return undefined
  }
  problems(
    row,
    column,
    `${column} is '${raw}'. ${what} is whole digits, optionally grouped in threes with '.' or ',': write 185000 for Rp 185.000.`,
  )
  return undefined
}

const problems = (row: Row, column: string, text: string) => {
  throw new RowProblem({ column, problem: text })
}

/** Raised to carry a planning problem out of a helper; turned back into `problems` below. */
class RowProblem {
  constructor(readonly problem: Problem) {}
}

function planSku(row: Row, column: 'sku' | 'parent_sku'): string | null {
  const sku = clean(row.cells[column])
  if (sku === '') return null
  if (!SKU_PATTERN.test(sku)) {
    throw new RowProblem({
      column,
      problem: `${column} is '${sku}'. Use letters, digits, dots, hyphens, underscores or slashes, with no spaces.`,
    })
  }
  return sku
}

/** One products row: a product (no `parent_sku`) or a variant of one. */
export function planProductRow(row: Row, vocab: Vocabulary, variant: boolean): PlannedRow {
  try {
    const sku = planSku(row, 'sku')
    if (sku === null)
      throw new RowProblem({ column: 'sku', problem: 'sku is empty. It is required.' })

    if (variant) {
      const parentSku = planSku(row, 'parent_sku')
      if (parentSku === null) {
        throw new RowProblem({
          column: 'parent_sku',
          problem: 'parent_sku is empty. A variant names the product it belongs to.',
        })
      }
      const labelEn = clean(row.cells.variant_label_en)
      if (labelEn === '') {
        throw new RowProblem({
          column: 'variant_label_en',
          problem: 'variant_label_en is empty. Name the variant as buyers choose it.',
        })
      }
      const label: Record<string, unknown> = { en: labelEn }
      if (clean(row.cells.variant_label_id) !== '') label.id = clean(row.cells.variant_label_id)
      const data: Record<string, unknown> = { sku, parentSku, label }
      const price = number_(row, 'price_idr', clean(row.cells.price_idr), 1, 'A variant price')
      if (price !== undefined) data.price = price
      return planned(row.row, row.key, 'products', data)
    }

    const problems_: Problem[] = []
    const nameEn = clean(row.cells.name_en)
    const empty = nonEmpty(row, 'name_en', nameEn)
    if (empty) problems_.push(empty)
    const category = clean(row.cells.category)
    const categoryEmpty = nonEmpty(row, 'category', category)
    if (categoryEmpty) problems_.push(categoryEmpty)
    const price = number_(row, 'price_idr', clean(row.cells.price_idr), 1, 'The price')
    if (price === undefined) {
      problems_.push({
        column: 'price_idr',
        problem: 'price_idr is empty or not a whole number of rupiah above zero.',
      })
    }
    if (problems_.length > 0) return refused(row.row, row.key, problems_)

    const data: Record<string, unknown> = { sku, name: { en: nameEn }, price }
    if (clean(row.cells.name_id) !== '') data.name = { en: nameEn, id: clean(row.cells.name_id) }
    if (clean(row.cells.description_en) !== '' || clean(row.cells.description_id) !== '') {
      const description: Record<string, unknown> = {}
      if (clean(row.cells.description_en) !== '') description.en = clean(row.cells.description_en)
      if (clean(row.cells.description_id) !== '') description.id = clean(row.cells.description_id)
      data.description = description
    }
    // The template's `active` column is a variant's on-sale flag; a product row's one is not a
    // field of `products` (availability is stock levels, on-sale lives per variant), so a
    // product row leaves it unread rather than writing a field the collection would drop.
    const imageFiles = (row.cells.image_files ?? '')
      .split(';')
      .map((each) => each.trim())
      .filter((each) => each !== '')

    const categoryMatch = vocab.terms('', category)
    if (!('id' in categoryMatch)) {
      return {
        row: row.row,
        key: row.key,
        hold: [
          {
            column: 'category',
            problem: `The category '${category}' matches no term on record — did you mean ${categoryMatch.suggestions.join(', ')}?`,
            fix: 'Add the category as a term, then import again.',
          },
        ],
      }
    }
    data.category = categoryMatch.id
    if (clean(row.cells.related_stock_number) !== '') {
      data.relatedStockNumber = clean(row.cells.related_stock_number)
    }

    return planned(
      row.row,
      row.key,
      'products',
      data,
      imageFiles.length > 0 ? imageFiles : undefined,
    )
  } catch (error) {
    if (error instanceof RowProblem) return refused(row.row, row.key, [error.problem])
    throw error
  }
}

/** One stores row. */
export function planStoreRow(row: Row): PlannedRow {
  try {
    const code = clean(row.cells.store_code)
    if (code === '')
      throw new RowProblem({
        column: 'store_code',
        problem: 'store_code is empty. It is required.',
      })
    const name = clean(row.cells.name)
    if (name === '')
      throw new RowProblem({ column: 'name', problem: 'name is empty. It is required.' })
    const address = clean(row.cells.address)
    if (address === '')
      throw new RowProblem({ column: 'address', problem: 'address is empty. It is required.' })
    const lat = clean(row.cells.lat)
    const lng = clean(row.cells.lng)
    if (lat === '' || lng === '') {
      throw new RowProblem({
        column: 'lat',
        problem: 'lat and lng are the map pin the orders are sent from; give both.',
      })
    }
    if (!/^-?\d+(\.\d+)?$/.test(lat) || !/^-?\d+(\.\d+)?$/.test(lng)) {
      throw new RowProblem({
        column: 'lat',
        problem:
          'lat is ' + (lat === '' ? lng : lat) + '. Decimal degrees, e.g. -8.5069 and 115.2625.',
      })
    }

    const data: Record<string, unknown> = {
      code,
      name,
      address,
      lat: Number(lat),
      lng: Number(lng),
    }
    if (clean(row.cells.area) !== '') data.area = clean(row.cells.area)
    if (clean(row.cells.whatsapp) !== '') data.whatsapp = clean(row.cells.whatsapp)
    if (clean(row.cells.hours_en) !== '' || clean(row.cells.hours_id) !== '') {
      const hours: Record<string, unknown> = {}
      if (clean(row.cells.hours_en) !== '') hours.en = clean(row.cells.hours_en)
      if (clean(row.cells.hours_id) !== '') hours.id = clean(row.cells.hours_id)
      data.hours = hours
    }
    for (const [column, field] of [
      ['active', 'active'],
      ['public', 'listed'],
    ] as const) {
      const flag = yesNo(row.cells[column], column)
      if (flag.error) throw new RowProblem({ column, problem: flag.error })
      if (flag.value !== undefined) data[field] = flag.value
    }
    return planned(row.row, row.key, 'stores', data)
  } catch (error) {
    if (error instanceof RowProblem) return refused(row.row, row.key, [error.problem])
    throw error
  }
}

/** One stock row, as raw keys: the store and product are resolved in `./apply`. */
export function planStockRow(row: Row): PlannedRow {
  try {
    const storeCode = clean(row.cells.store_code)
    if (storeCode === '')
      throw new RowProblem({
        column: 'store_code',
        problem: 'store_code is empty. It is required.',
      })
    const sku = planSku(row, 'sku')
    if (sku === null)
      throw new RowProblem({ column: 'sku', problem: 'sku is empty. It is required.' })
    const quantity = number_(
      row,
      'quantity',
      clean(row.cells.quantity),
      0,
      'The count on the shelf',
    )
    if (quantity === undefined) {
      throw new RowProblem({
        column: 'quantity',
        problem: 'quantity is empty or not a whole number, 0 or more.',
      })
    }
    return planned(row.row, row.key, 'stock-levels', {
      storeCode,
      sku,
      variantSku: clean(row.cells.variant_sku) === '' ? null : clean(row.cells.variant_sku),
      physicalCount: quantity,
    })
  } catch (error) {
    if (error instanceof RowProblem) return refused(row.row, row.key, [error.problem])
    throw error
  }
}

/** One discounts row. */
export function planDiscountRow(row: Row): PlannedRow {
  try {
    const code = clean(row.cells.code)
    if (code === '')
      throw new RowProblem({ column: 'code', problem: 'code is empty. It is required.' })
    const kind = pickOption(['percent', 'fixed'], clean(row.cells.kind), 'kind')
    if (!kind)
      throw new RowProblem(optionProblem('kind', clean(row.cells.kind), ['percent', 'fixed']))
    const value = number_(row, 'value', clean(row.cells.value), 1, 'The discount value')
    if (value === undefined) {
      throw new RowProblem({
        column: 'value',
        problem:
          'value is empty or not a whole number. A percent code is 1 to 100; a rupiah code is whole rupiah above zero.',
      })
    }
    const data: Record<string, unknown> = { code: code.toUpperCase(), kind, value }
    const minSpend = number_(row, 'min_spend', clean(row.cells.min_spend), 0, 'The minimum spend')
    if (minSpend !== undefined) data.minSpend = minSpend
    const oncePerBuyer = yesNo(row.cells.once_per_buyer, 'once_per_buyer')
    if (oncePerBuyer.error)
      throw new RowProblem({ column: 'once_per_buyer', problem: oncePerBuyer.error })
    if (oncePerBuyer.value !== undefined) data.oncePerBuyer = oncePerBuyer.value
    for (const column of ['starts_at', 'ends_at'] as const) {
      const raw = clean(row.cells[column])
      if (raw === '') continue
      if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        throw new RowProblem({
          column,
          problem: `${column} is '${raw}'. Write the date as 2026-01-31.`,
        })
      }
      data[column === 'starts_at' ? 'startsAt' : 'endsAt'] = raw
    }
    const usageLimit = number_(
      row,
      'usage_limit',
      clean(row.cells.usage_limit),
      1,
      'The uses allowed',
    )
    if (usageLimit !== undefined) data.usageLimit = usageLimit
    const active = yesNo(row.cells.active, 'active')
    if (active.error) throw new RowProblem({ column: 'active', problem: active.error })
    if (active.value !== undefined) data.active = active.value
    return planned(row.row, row.key, 'discounts', data)
  } catch (error) {
    if (error instanceof RowProblem) return refused(row.row, row.key, [error.problem])
    throw error
  }
}
