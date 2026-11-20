/**
 * Stock per store on the product (TASKS.md 27.2.d; the plan's §3.2): the `stock` `ui` field's
 * component. A server component: the stores and this product's stock rows are read as the person
 * (`./data` `stockTable`, `overrideAccess: false`), so store staff get their own store's column
 * alone; the table and its saves are the client's (`./stock-client.jsx`). The columns are the
 * product's saved variants — a stock row names a variant the saved product has. `.jsx`: see
 * `../leads/shared.jsx`'s header.
 */
import { roleOf } from '@engine/cms-core/access'

import { L } from './copy'
import { stockTable } from './data'
import { columnsOf } from './stock-grid'
import { StockClient } from './stock-client'

export async function ProductStockField(props) {
  const { id, req, user, data, i18n } = props
  const language = i18n?.language === 'id' ? 'id' : 'en'
  const who = user ?? req?.user
  const saved = id !== undefined && id !== null && id !== ''
  const table = saved && req?.payload ? await stockTable(req.payload, who, id) : null
  const variants = Array.isArray(data?.variants) ? data.variants : []
  return (
    <StockClient
      productId={saved ? id : null}
      role={roleOf(who)}
      stores={table?.stores ?? []}
      rows={table?.rows ?? []}
      columns={columnsOf(variants, L('stockColumn', language))}
    />
  )
}
