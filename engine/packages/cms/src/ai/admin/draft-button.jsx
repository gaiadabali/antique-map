/**
 * "Draft from photographs" — the work edit view's sidebar block (TASKS.md 8.3 item 4). A server
 * component: it renders the button for the owner and the editors only, on a saved work, and
 * leaves everything else to the route (`/api/x/draft`), which checks the session again. `.jsx`:
 * the cms package does not type-check React — see `../../admin/leads/shared.jsx`'s header.
 */
import { isCatalogueStaff } from '../../access/roles'
import { DraftButtonClient } from './draft-button-client'

export function DraftFromPhotosButton({ id, req, user, i18n }) {
  const who = req?.user ?? user
  if (id === undefined || id === null || !isCatalogueStaff(who)) return null
  const language = i18n?.language === 'id' ? 'id' : 'en'
  return <DraftButtonClient workId={String(id)} language={language} />
}
