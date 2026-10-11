/**
 * The order form's rarely-read sections (History, Payment, Driver, Handed back, Store as sold),
 * folded closed so an order opens on what staff act on (`../../fields/fold`).
 */
import type { Field } from 'payload'

import { foldSections } from '../../fields/fold'

const FOLDED = new Set(['history', 'payment', 'driverImage', 'needsAttention', 'storeSnapshot'])

export function foldRarelyReadSections(fields: Field[]): Field[] {
  return foldSections(fields, FOLDED)
}
