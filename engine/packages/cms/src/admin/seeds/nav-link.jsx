/**
 * A link to the seed screen in the sidebar: a server component for `admin.components`
 * `beforeNavLinks`, owner only. Payload hands it `{ user, i18n }`, not `req`.
 * `.jsx`: see `../leads/shared.jsx`'s header.
 */
import { hasRole } from '../../collections/users/roles'
import { L } from './copy'

export async function SeedsNavLink({ user, i18n }) {
  if (!hasRole(user, 'owner')) return null
  const language = i18n?.language === 'id' ? 'id' : 'en'
  return (
    <a className="nav__link" href="/admin/seeds">
      {L('navLink', language)}
    </a>
  )
}
