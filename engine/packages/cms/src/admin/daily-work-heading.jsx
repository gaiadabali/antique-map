/**
 * The small heading above the working views (order panel, leads inbox, stock import) at the top of
 * the sidebar: a server component for `admin.components.beforeNavLinks`. Every role that sees one
 * of those links (owner, editor, store) sees the heading; anyone else sees nothing. Uses Payload's
 * own nav-group classes so it matches the group headings below it. `.jsx`: see
 * `./leads/shared.jsx`'s header.
 */
import { hasRole } from '../collections/users/roles'

const HEADING = { en: 'Daily work', id: 'Pekerjaan harian' }

export async function DailyWorkHeading({ user, i18n }) {
  if (!hasRole(user, 'owner', 'editor', 'store')) return null
  const language = i18n?.language === 'id' ? 'id' : 'en'
  return (
    <div className="nav-group">
      <div className="nav-group__toggle">
        <div className="nav-group__label">{HEADING[language]}</div>
      </div>
    </div>
  )
}
