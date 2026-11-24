/**
 * "Add a staff member" above the staff list (TASKS.md 27.6.c): a server component for the users
 * collection's `admin.components.beforeList`, the owner's alone — anyone else sees nothing, not a
 * dead button. It opens the quick form at `/admin/staff/new` (`./add-view.jsx`).
 * `.jsx`: see `../leads/shared.jsx`'s header.
 */
import { hasRole } from '@engine/cms-core/access'

import { S } from './copy'
import { StaffStyles } from './styles-client'

export async function AddStaffButton({ user, i18n }) {
  if (!hasRole(user, 'owner')) return null
  const language = i18n?.language === 'id' ? 'id' : 'en'
  return (
    <div className="ix-staff-bar">
      <StaffStyles />
      <a className="ix-btn ix-btn--primary" href="/admin/staff/new">
        {S('addButton', language)}
      </a>
    </div>
  )
}
