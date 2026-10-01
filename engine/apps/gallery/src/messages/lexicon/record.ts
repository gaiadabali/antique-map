/**
 * The record: the labels of the item page's collation block, the definition list collectors
 * expect (EXPERIENCE-GALLERY.md §5) — one per field of C2 `RecordVM`, `BookPartVM` and
 * `ConditionVM` and the item's references and provenance (view-models/src/surfaces/item.ts),
 * named by the field (`record.publication.publisher`). The values beside them are data, but for
 * the colouring, a contract's list named by its code (`colouring.${colouring}`).
 * Keys and neutral defaults only — the words are the brand’s (`../keys.ts`).
 */
import { defineMessages } from '@engine/i18n'

export const RECORD_KEYS = defineMessages({
  // C2 RecordVM, in the block's order; the stock number is `label.stockNumber`
  'record.objectType': 'Type',
  'record.publication.place': 'Place of publication',
  'record.publication.publisher': 'Publisher',
  'record.date': 'Date of this issue',
  'record.firstEdition': 'First edition',
  'record.dateOnPlate': 'Date on plate',
  'record.publication.sourceWork': 'Source work',
  'record.publication.verso': 'Verso',
  'record.publication.textLanguage': 'Text',
  'record.publication.edition': 'Edition',
  'record.publication.state': 'State',
  'record.technique': 'Technique',
  'record.colour': 'Colouring',
  // its value, by code (C2 Colouring, view-models/src/common.ts:214; TASKS.md 6.3.i)
  'colouring.publishers': 'Publisher’s colour',
  'colouring.original-hand': 'Original hand colour',
  'colouring.old-hand': 'Old hand colour',
  'colouring.later': 'Later colour',
  'colouring.printed': 'Printed in colour',
  'colouring.uncoloured': 'Uncoloured',
  // C2 DimensionsVM: mm and inches come from the formatter
  'record.dimensions': 'Dimensions',
  'record.dimensions.image': 'Image',
  'record.dimensions.sheet': 'Sheet',
  'record.dimensions.framed': 'Framed',
  // C2 ConditionVM: the grade is the brand's published scale, linked to its legend
  'record.condition': 'Condition',
  'record.condition.scale': 'How we grade condition',
  'record.condition.notes': 'Notes',
  'record.condition.defects': 'Defects',
  'record.condition.restoration': 'Restoration',
  'record.references': 'References',
  'record.provenance': 'Provenance',
  // C2 BookPartVM: a volume's collation, not a sheet's
  'record.book.binding': 'Binding',
  'record.book.pagination': 'Pagination',
  'record.book.plates': 'Plates',
  'record.book.completeness': 'Completeness',
  'record.book.openings': 'Openings',
  'record.book.spine': 'Spine',
  'record.book.cover': 'Cover',
})
