/**
 * Who sees what in the admin sidebar (TASKS.md 3.6.b; CONTENT-MODEL.md §7). These are the
 * `admin.hidden` lines of each collection and global — the menu only. The access functions
 * (the collections' access modules, built from the same role helpers in
 * `../collections/users/roles`) still enforce every read; hiding a menu entry never grants one,
 * and a collection hidden from a role is one that role cannot read.
 *
 * Three audiences, so menu and access agree:
 * - `hiddenFromAllButAllStaff` — the owner, an editor or store staff: a store's own orders and
 *   stock, the only things store staff work with in the admin.
 * - `hiddenFromAllButCatalogueStaff` — the owner or an editor: the catalogue, content and the
 *   shop's settings. Store staff see none of it.
 * - `hiddenFromAllButOwner` — the owner alone: leads, partners and chat sessions, analytics
 *   events and site settings.
 */
import type { SignedIn } from '../collections/users/roles'

import { hasRole } from '../collections/users/roles'

/** The owner, an editor or store staff — the people who may enter the admin and work. */
export const hiddenFromAllButAllStaff = ({ user }: { user: SignedIn }): boolean =>
  !hasRole(user, 'owner', 'editor', 'store')

/** The owner or an editor — never store staff (the catalogue, content and shop sides). */
export const hiddenFromAllButCatalogueStaff = ({ user }: { user: SignedIn }): boolean =>
  !hasRole(user, 'owner', 'editor')

/** The owner alone — leads, partners, chat sessions, analytics and settings. */
export const hiddenFromAllButOwner = ({ user }: { user: SignedIn }): boolean =>
  !hasRole(user, 'owner')