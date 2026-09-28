/**
 * @contract C2 — fixtures `not-found`, `gone`, `error` · owner: ARC
 *
 * A legacy product URL that no longer resolves, turned into a prefilled search; an item
 * removed from inventory; a server error with a reference to quote.
 */
import type { ErrorVM, GoneVM, NotFoundVM } from '../surfaces/status'
import { card, streamed } from './_shared'

export const notFoundLegacy: NotFoundVM = {
  surface: 'notFound',
  search: { q: 'isle of contoh 1718', href: '/search?q=isle%20of%20contoh%201718' },
  similar: streamed([card(1003, 'The Isle of Contoh (another example)')]),
}

export const gone: GoneVM = {
  surface: 'gone',
  title: 'View of the Harbour, 1730',
  similar: streamed([card(1008, 'View of the Harbour')]),
}

export const serverError: ErrorVM = { surface: 'error', reference: 'req_fixture_7f3a' }
