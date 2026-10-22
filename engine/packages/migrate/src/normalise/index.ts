/**
 * The normalisers (TASKS.md 7.2, MIGRATION.md §4): raw legacy values → the
 * engine's value shapes, each with its raw value and a confidence, and a
 * review queue for everything below it.
 */
export { fromCatalogueRow, fromPublicRead, type CatalogueRow } from './adapters.ts'
export { parseCondition } from './condition.ts'
export { parseDate, splitPublication, type Publication } from './dates.ts'
export { parseDimensions, toMillimetres } from './dimensions.ts'
export { imageSizeOf, readImageSize, type ImageSize } from './image-size.ts'
export { parseOrientation, toSizes } from './orientation.ts'
export { parsePrice, type PriceInput } from './price.ts'
export {
  FIELDS,
  normaliseAll,
  normaliseRecord,
  type FieldName,
  type LegacyProductInput,
  type NormalisedFields,
  type NormalisedRecord,
} from './record.ts'
export { parseReferences } from './references.ts'
export {
  countFields,
  reasonsByField,
  reviewRows,
  toCsv,
  toJsonl,
  type FieldCounts,
  type ReviewRow,
} from './review.ts'
export { DEFAULT_TABLES, parseTables, type GradeTerm, type NormaliseTables } from './tables.ts'
export { parseTitles, type TitleInput, type TitleValue } from './titles.ts'
export * from './types.ts'
export {
  parseCategories,
  parseColour,
  parseMaker,
  parsePlace,
  parseStockNumber,
} from './vocabulary.ts'
