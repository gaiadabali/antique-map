/**
 * The order form's rarely-read sections (History, Payment, Driver, Handed back, Store as sold),
 * folded closed so an order opens on what staff act on (`@engine/cms-core/fields` `foldSections`).
 */
import { foldSections } from '@engine/cms-core/fields'
import type { Field } from 'payload'

const FOLDED = new Set(['history', 'payment', 'driverImage', 'needsAttention', 'storeSnapshot'])

export function foldRarelyReadSections(fields: Field[]): Field[] {
  return foldSections(fields, FOLDED)
}
