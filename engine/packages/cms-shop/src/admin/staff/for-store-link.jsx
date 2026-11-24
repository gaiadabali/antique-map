/**
 * "Add staff for this store" in a store's sidebar (TASKS.md 27.7): the owner who is looking at a
 * store adds its staff from there, the store already chosen on the add-staff screen
 * (`./add-view.jsx`, `?store=<id>`). The owner's alone, as adding staff is; nothing for a store
 * not yet saved. A `ui` field's server component: no data, no column. `.jsx`: see
 * `../leads/shared.jsx`'s header.
 */
import { roleOf } from '@engine/cms-core/access'

import { S } from './copy'

export function StaffForStoreLink({ data, user, i18n }) {
  const id = data?.id
  if (!id || roleOf(user) !== 'owner') return null
  const language = i18n?.language === 'id' ? 'id' : 'en'
  return (
    <p className="field-type">
      <a className="btn btn--style-secondary btn--size-small" href={`/admin/staff/new?store=${id}`}>
        {S('forStore', language)}
      </a>
    </p>
  )
}
