/**
 * Folds the order form's rarely-read sections (History, Payment, Driver, Handed back, Store as
 * sold) into closed unnamed collapsibles, so an order opens on what staff act on. A collapsible
 * is presentational: the named group or array inside keeps its data path, so the schema and
 * `payload-types.ts` do not change. A group's own heading is blanked (the collapsible shows it).
 */
import type { Field } from 'payload'

const FOLDED = new Set(['history', 'payment', 'driverImage', 'needsAttention', 'storeSnapshot'])

export function foldRarelyReadSections(fields: Field[]): Field[] {
  return fields.map((field): Field => {
    if (!('name' in field) || !FOLDED.has(field.name)) return field
    const label = 'label' in field && field.label ? field.label : field.name
    const inner = field.type === 'group' ? { ...field, label: { en: '', id: '' } } : field
    return { type: 'collapsible', label, admin: { initCollapsed: true }, fields: [inner] }
  })
}
