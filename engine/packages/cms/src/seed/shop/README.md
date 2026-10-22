# The shop's mock seed files (TASKS.md 3.7.c)

Committed import files for the shop's mock set (docs/DATA.md §1–§2): the catalogue, stores, stock and the
welcome discount the shop is built and tested on until the owner's real sheets arrive (OA3, OA4). They are the
**first user of the 3.7.a spreadsheet import** — the importer loads them with no code change, and the owner's
real files replace them the same way (`pnpm data:purge-seed` deletes every `SEED-` product, store and stock row;
refused in production).

## Files (`data/`)

| File            | Key                                         | Columns                                                                                      | Holds                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stores.csv`    | `store_code`                                | CONTENT-MODEL.md §9 Stores, plus `public`                                                    | 120 mock stores, 8 in each of 15 real Bali towns (code `<TOWN>-001`…`-008`), pins jittered ≤ 0.03° around the town centre and kept inside lat −8.85…−8.05, lng 114.43…115.71; WhatsApp in E.164 `+62…`; hours in both languages; `active` ≈ 95 % `yes`; `public` ≈ 80 % `yes` (which stores the `/stores` page may list — OA3). Names read "Seed store, Ubud 03", addresses are plainly mock.                                                                               |
| `products.csv`  | `sku`; a variant row names its `parent_sku` | CONTENT-MODEL.md §9 Products                                                                 | 80 products across the shop's categories (Prints, Map reproductions, Textiles, Homeware, Stationery, Gifts), `price_idr` whole rupiah rounded to Rp 5.000 within Rp 75.000–4.500.000, names and descriptions in `en` and `id`, SKUs start `SEED-`, `related_stock_number` left empty. About a third have variants (`variant_label_en`/`_id`); variant rows repeat the product's fields and carry the product's price (a variant without its own price takes the product's). |
| `stock.csv`     | `store_code` + `sku`                        | §9 Stock, plus `variant_sku`                                                                 | What each store can still sell: `sku` is the product's SKU and `variant_sku` the variant's (empty for a product without variants), `quantity` 0–12, ≈ 30 % zero. Four products are out of stock everywhere so the "Out of stock" path is testable; every other product is in stock in at least one store.                                                                                                                                                                   |
| `discounts.csv` | `code`                                      | the `discounts` collection's fields (CONTENT-MODEL.md §4 — §9 does not define these columns) | The welcome code `WELCOME10`: 10 %, `once_per_buyer` yes (single use per contact), active, no window or usage limit.                                                                                                                                                                                                                                                                                                                                                        |

## Regenerate

Deterministic (inline mulberry32, seed `20261003`, no new dependency, no clock): the same command twice writes
identical bytes — `generate.test.ts` asserts it.

```bash
node engine/packages/cms/src/seed/shop/generate.ts
pnpm vitest run engine/packages/cms/src/seed/shop
```

(`tsx` is not a dependency of this repo; the generator is plain TypeScript and runs on Node ≥ 22.13's native
type stripping, which the engines field requires anyway.)
