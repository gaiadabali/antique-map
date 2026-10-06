/**
 * "Create partner" — the lead edit view's sidebar button (TASKS.md 9.1.b): shown only on a
 * `partnership` lead with no `partner` yet. Posts a plain form (no client JS) to the lead's own
 * collection endpoint (`../../collections/leads/create-partner.ts`), which creates the partner,
 * links the lead, and redirects to the new partner's edit page. `.jsx`: see `./shared.jsx`'s header.
 */
import { L, SubmitButton } from './shared'

export function CreatePartnerButton({ data, id, i18n }) {
  const language = i18n?.language === 'id' ? 'id' : 'en'
  const partner = data?.partner
  const hasPartner = partner !== null && partner !== undefined
  if (data?.kind !== 'partnership' || hasPartner) return null

  return (
    <form method="post" action={`/api/leads/${id}/create-partner`}>
      <SubmitButton>{L('createPartner', language)}</SubmitButton>
    </form>
  )
}
