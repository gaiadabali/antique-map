/**
 * A link to the inbox in the sidebar's "Leads and partners" group (TASKS.md 9.1.a): a server
 * component for `admin.components.afterNavLinks`, owner only — anyone else sees nothing, not a
 * dead link. `.jsx`: see `./shared.jsx`'s header.
 */
import { hasRole } from '../../collections/users/roles'
import { L } from './shared'

export async function LeadsNavLink({ req }) {
  if (!hasRole(req?.user, 'owner')) return null
  const language = req?.i18n?.language === 'id' ? 'id' : 'en'
  return (
    <a className="nav__link" href="/admin/leads">
      {L('inboxTitle', language)}
    </a>
  )
}
