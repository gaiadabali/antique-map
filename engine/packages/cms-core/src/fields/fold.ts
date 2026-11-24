/**
 * Folds a form's rarely-read sections into closed unnamed collapsibles, so a record opens on what
 * staff fill in most (the order form since 15.3; the antique record since TASKS.md 16). A
 * collapsible is presentational: the named group or array inside keeps its data path, so the
 * schema and `payload-types.ts` do not change. A group's own heading is blanked (the collapsible
 * shows it).
 */
import type { Field } from 'payload'

export function foldSections(fields: Field[], names: ReadonlySet<string>): Field[] {
  return fields.map((field): Field => {
    if (!('name' in field) || !names.has(field.name)) return field
    const label = 'label' in field && field.label ? field.label : field.name
    const inner = field.type === 'group' ? { ...field, label: { en: '', id: '' } } : field
    return { type: 'collapsible', label, admin: { initCollapsed: true }, fields: [inner] }
  })
}
