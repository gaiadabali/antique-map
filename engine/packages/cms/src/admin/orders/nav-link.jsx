/**
 * A link to the order panel in the sidebar (10.4 proxy run): a server component for
 * `admin.components.afterNavLinks`. Payload's own Orders entry opens the collection table, whose
 * order page has no next-step button; the panel (`./view.jsx`) is where staff move an order. Owner,
 * editor and store staff see it; anyone else sees nothing, not a dead link. `.jsx`: see
 * `./shared.jsx`'s header.
 */
import { hasRole } from '../../collections/users/roles'
import { L } from './shared'

export async function OrdersNavLink({ req }) {
  if (!hasRole(req?.user, 'owner', 'editor', 'store')) return null
  const language = req?.i18n?.language === 'id' ? 'id' : 'en'
  return (
    <a className="nav__link" href="/admin/orders">
      {L('navLink', language)}
    </a>
  )
}
