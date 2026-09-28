/**
 * @contract C2 — view models: not found, gone, error · owner: ARC · consumers: WEB, UXG, UXE, MIG
 *
 * Designed, not defaulted (DESIGN-SYSTEM.md §2). A legacy `/product/{id}-{slug}` that no
 * longer resolves turns its slug into a prefilled search with similar works; an item removed
 * from inventory is Gone — a sold item never is, it stays live as sold; a server error offers
 * WhatsApp (the shell's contact) and a reference to quote, never a stack trace. The shell
 * renders around each, so contact details come from `ShellVM`.
 */
import type { CardVM } from '../cards'
import type { Streamed } from '../common'

export type NotFoundVM = {
  surface: 'notFound'
  /** From a legacy product slug: "bali island 1706" as a search, and what it finds. */
  search: { q: string; href: string } | null
  similar: Streamed<readonly CardVM[]>
}

export type GoneVM = {
  surface: 'gone'
  /** The removed item's title, when the record of it survives. */
  title: string | null
  similar: Streamed<readonly CardVM[]>
}

export type ErrorVM = {
  surface: 'error'
  /** The correlation id the log carries, for the buyer to quote on WhatsApp. */
  reference: string | null
}
