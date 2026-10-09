/**
 * A link to the stock import screen in the sidebar (TASKS.md 10.8.a): a server component for
 * `admin.components.afterNavLinks`, owner only. Payload hands it `{ user, i18n }`, not `req`.
 * `.jsx`: see `../leads/shared.jsx`'s header.
 */
import { hasRole } from '../../collections/users/roles'
import { L } from './copy'

export async function StockImportNavLink({ user, i18n }) {
  if (!hasRole(user, 'owner')) return null
  const language = i18n?.language === 'id' ? 'id' : 'en'
  return (
    <a className="nav__link" href="/admin/stock-import">
      {L('navLink', language)}
    </a>
  )
}
