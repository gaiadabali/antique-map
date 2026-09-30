# `laravel-catalogue` — restore a MySQL dump, discover it, extract by SQL

The source adapter for an old store's database export (MIGRATION.md §3,
TASKS.md 7.1.b and 7.1.f). The dump is **never parsed here**: it is handed to
the mysql client inside a throwaway MySQL container, and everything after
that is SQL against the restored database.

| File         | Job                                                                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker.ts`  | the container: started with no published port, a per-container root password passed by environment only, mysql run through `docker exec`                                                          |
| `restore.ts` | any dump path, `.sql` or `.sql.gz`: copy in, restore (the first refused statement stops it), find the schema it filled, exact `COUNT(*)` per table                                                |
| `schema.ts`  | tables, columns, indexes, foreign keys, views, triggers, routines; each column flagged `secret` or `personal` by name; Markdown notes (structure and counts, never a row)                         |
| `extract.ts` | named queries (a folder of `*.sql`, one `JSON_OBJECT` per row) → JSON Lines; or every table losslessly (decimals and dates as text, zero dates kept, binary as base64, `secret` columns left out) |
| `cli.ts`     | `restore`, `schema`, `extract`, `tables`, `destroy` — `pnpm legacy:mysql <command>` from the package folder                                                                                       |

Output goes to `$LEGACY_DATA_DIR/mysql/<label>/` (`--name <label>`, default
`catalogue`; the container is `migrate-legacy-<label>`), outside git.

## The mock dump (D42)

`fixtures/mock-dump.sql` stands in for the owner's export until it arrives:
a plain mysqldump 5.7-style file (no `CREATE DATABASE`/`USE`), Laravel-shaped
(`users`, `password_resets`, `categories`, `mapmakers`, `products`,
`product_images`, `category_product`, `orders`, `order_items`, `wishlists`,
`product_requests`, `newsletter_subscribers`, `pages`, `migrations`,
`failed_jobs`). **Every row is invented**: fictional people at
`example.invalid`, placeholder strings where passwords and tokens would be.
`fixtures/mock-queries/*.sql` are its extraction queries — the starting point
for the real dump's, which live in the brand's `content/legacy/schema/queries/`.

The dirty data of MIGRATION.md §4, by row (`products.id`):

| Case                                                                                                                                                                                                         | Row                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `Year: null` — a NULL year / the text `null`                                                                                                                                                                 | 1300 / 1302                                                  |
| `Year: Leiden` — a place in the year field                                                                                                                                                                   | 1301                                                         |
| `40 b7 22 cm.`                                                                                                                                                                                               | 1044                                                         |
| mixed mm/cm and x/by (`450 x 380 mm`, `23x17cm`, `45 by 38 cm.`, `36,5 by 28 cm.`)                                                                                                                           | 1009, 1015, 1001, 1302                                       |
| no inches anywhere                                                                                                                                                                                           | all (tested)                                                 |
| empty colour — `''` / NULL                                                                                                                                                                                   | 1009, 1301 / 1015, 1101                                      |
| missing maker — NULL `mapmaker_id`                                                                                                                                                                           | 1015, 1500, 1600…                                            |
| maker aliases (Valentijn / Valentyn)                                                                                                                                                                         | 1044 vs 1200                                                 |
| freehand condition (`G+ / Study images carefully`, `…image carefully`, `Good, some foxing…`, `G / linen backed`)                                                                                             | 1101, 1044, 1603, 1800                                       |
| SKUs `M.1044`, `M.Dav5` (and `M.Dav12`, `P.`, `F.` numbers)                                                                                                                                                  | 1101, 1044, 2090, 1600, 1700                                 |
| one chart with **16** category tags                                                                                                                                                                          | 1009                                                         |
| "On Request" — NULL price / `0.00`, flag set                                                                                                                                                                 | 1044, 1101, 1015 / 1850                                      |
| SEO-suffixed titles (`- Year 1661`, `- Extremely rare map`, both at once)                                                                                                                                    | 1001, 1044, 2000                                             |
| inline `( Ref: … )` and `(Ref: …)`                                                                                                                                                                           | 1044, 1101, 2090                                             |
| sold, sold with no price, sold with a zero date                                                                                                                                                              | 1001, 1350, 1950                                             |
| unlisted (only in the export), soft-deleted                                                                                                                                                                  | 1605, 1701, 2000 / 1900                                      |
| taxonomy defects: counts that do not roll up, India & Sri Lanka under South East Asia, `pre-1700-maps` named "Pre-1750 Maps", Mammal/Mammals Prints, a Tasmania plan under Indonesia Maps, a hidden category | categories 4 vs 22, 30, 31, 62/63, product 1250, category 98 |
| restore-hard text: quotes, backslash, line breaks, em dash, CJK (utf8mb4)                                                                                                                                    | 2090                                                         |
| staff-only fields (`acquisition_cost`, `consignor`)                                                                                                                                                          | 1001, 1009, 1200, 1605, 2090                                 |

`test/mock-dump.test.ts` checks each case is present; the extraction itself
is `test/restore.integration.test.ts`, which needs Docker and runs with
`MIGRATE_MYSQL_IT=1` (PowerShell: `$env:MIGRATE_MYSQL_IT='1'`):

```sh
MIGRATE_MYSQL_IT=1 pnpm vitest run engine/packages/migrate/src/sources/laravel-catalogue
```
