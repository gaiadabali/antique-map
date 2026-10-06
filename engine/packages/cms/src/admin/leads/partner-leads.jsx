/**
 * The partner edit view's sidebar list of leads that point to it (TASKS.md 9.1.b): a `join`
 * field would be a schema change this ticket does not own, so this UI field queries `leads`
 * where `partner = id` instead (`overrideAccess: false`). `.jsx`: see `./shared.jsx`'s header.
 */
import { LEAD_KIND_LABELS, LEAD_STATUS_LABELS } from '../../collections/leads/kinds'
import { L } from './shared'

async function loadPartnerLeads(payload, req, partnerId) {
  if (!partnerId) return []
  const result = await payload.find({
    collection: 'leads',
    depth: 0,
    limit: 50,
    overrideAccess: false,
    user: req.user,
    req,
    select: { kind: true, status: true, createdAt: true },
    sort: '-createdAt',
    where: { partner: { equals: partnerId } },
  })
  return result.docs
}

export async function PartnerLeadsList({ id, payload, req, i18n }) {
  const language = i18n?.language === 'id' ? 'id' : 'en'
  const leads = await loadPartnerLeads(payload, req, id)

  return (
    <div>
      <h4>{L('partnerLeadsTitle', language)}</h4>
      {leads.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--theme-elevation-500)' }}>
          {L('partnerLeadsEmpty', language)}
        </p>
      ) : (
        leads.map((lead) => (
          <div key={lead.id}>
            <a href={`/admin/collections/leads/${lead.id}`} style={{ fontSize: 13 }}>
              {LEAD_KIND_LABELS[lead.kind]?.[language] ?? lead.kind} ·{' '}
              {LEAD_STATUS_LABELS[lead.status]?.[language] ?? lead.status}
            </a>
          </div>
        ))
      )}
    </div>
  )
}
