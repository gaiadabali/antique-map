# `normalise` — raw legacy values → the engine's value shapes, and the review queue

TASKS.md 7.2, MIGRATION.md §4. Every parser returns a `Parsed<T>`:
`{ raw, status, value, proposal, confidence, reason }`. `value` is set only
when the reading is certain (`confidence ≥ CONFIDENT`, 0.9); otherwise the
field goes to **review** with the raw value beside a `proposal` — it is never
guessed into a field. `empty` means there was nothing to migrate (a blank
field, a sold item's "-" price, a NULL maker).

| File             | Field(s)                                       | Value shape (contract it mirrors)                                                         |
| ---------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `dates.ts`       | `date`, `place`                                | `{ precision, from, to, display }` — C2 `FuzzyDateVM`, CONTENT-MODEL.md §1 `date`         |
| `dimensions.ts`  | `dimensions`                                   | `{ image, sheet }`, each `{ sidesMm: [a, b], unit }` — whole millimetres, never inches    |
| `orientation.ts` | `orientation`                                  | `portrait` · `landscape` · `square`; with the dimensions → C2 `SizeVM` (`record.sizes`)   |
| `condition.ts`   | `condition`                                    | `{ grade, notes }` — the brand's scale (D10 by default), CONTENT-MODEL.md §1 `condition`  |
| `price.ts`       | `price`                                        | `{ mode: 'fixed', base: Money }` · `{ mode: 'on-request' }` — C5 `Money`, minor units     |
| `references.ts`  | `references`                                   | `[{ source, ref }]` — CONTENT-MODEL.md §1 `references` (the source resolved later)        |
| `titles.ts`      | `title`, `originalTitle`                       | `{ title, seoSuffixes }` — the hook title and the original, SEO suffixes moved out        |
| `vocabulary.ts`  | `stockNumber`, `colour`, `maker`, `categories` | preserved stock numbers (`M.1044`, `M.Dav5`), the colour select, raw makers, every tag    |
| `record.ts`      | —                                              | one `LegacyProductInput` through every parser; `normaliseAll` flags shared stock numbers  |
| `adapters.ts`    | —                                              | `PublicProductRecord` (the public read) and a database-extract row → `LegacyProductInput` |
| `review.ts`      | —                                              | review rows, JSON Lines and CSV (formula-safe), counts per field                          |
| `tables.ts`      | —                                              | `NormaliseTables`: the store's wording, as data, over neutral defaults                    |
| `cli.ts`         | —                                              | runs it all over an extract in `LEGACY_DATA_DIR`                                          |

**Height and width.** The old catalogue typed sizes in both orders (of the
crawled items whose image and measurement differ in shape, ~4 in 10 put the
width first), so `dimensions` keeps the sides in source order and
`orientation` decides which is the height from the item's own photograph
(`image-size.ts` reads its header). No image, a near-square image or an image
whose proportions do not match the measurement → review.

**Money.** Amounts are built from their digits as text — never a float — and
never rounded: more decimals than the currency has goes to review. The
exponents are the engine's (C1 `CURRENCY_EXPONENT`), passed in through the
tables because this package does not depend on `@engine/config`.

**Store wording is data.** The defaults hold no store's phrase: the D10 scale,
USD, "On Request"/"Price on Request", "-" for no price, "Unknown" as a
placeholder, the public read's panel labels. A site's
`data/<site>/mapping/normalise.json` adds its condition boilerplate, SEO
suffixes, SKU prefixes, grade aliases and colour mapping; `parseTables`
refuses an unknown key or a wrong shape.

Staff-only columns (acquisition cost, consignor) are never read by the
adapters, so they never reach the normalised output.

## The CLI

```sh
cd engine/packages/migrate
node --experimental-strip-types src/normalise/cli.ts public-read --tables <normalise.json>
node --experimental-strip-types src/normalise/cli.ts catalogue --name mock --tables <normalise.json>
```

It reads `$LEGACY_DATA_DIR/public-read/products/*.json` or
`$LEGACY_DATA_DIR/mysql/<name>/extract/products.jsonl` (`--in` overrides) and
writes `$LEGACY_DATA_DIR/normalised/<label>/` — `records.jsonl` (every field's
`Parsed`), `review.jsonl`, `review.csv` (`source, recordId, path, field, raw,
proposal, confidence, reason`) and `summary.json` (counts and review reasons
per field) — refusing any output folder inside the checkout. It prints
parsed / review / empty per field.

## Tests

`test/dirty-data.test.ts` has one test per dirty-data case of MIGRATION.md
§4, named after the case, run on the mock dump's rows
(`test/fixtures/mock-products.jsonl`, the `products.sql` extract of
`sources/laravel-catalogue/fixtures/mock-dump.sql`, staff-only columns left
out). The other tests cover each parser, the review file, the tables and the
CLI.
