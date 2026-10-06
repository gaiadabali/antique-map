/**
 * `POST /api/leads/:id/create-partner` (TASKS.md 9.1.b; CONTENT-OPERATIONS.md §4.2): the owner's
 * "Create partner" button on a `partnership` lead with no partner yet. Copies the business name
 * and contact from the lead, makes a `partners` row (`site: 'shop'`, `status: 'prospect'`), links
 * it back onto the lead, and redirects to the new partner's edit page — a plain form post, so the
 * browser follows the redirect itself.
 *
 * A collection endpoint, not an `/api/x/` route (AGENTS.md: "Payload owns `/api/*` otherwise") —
 * and outside `server/leads/**`, which a parallel review owns this run (9.1ui's orchestrator
 * note).
 */
import type { Endpoint, PayloadHandler } from 'payload'

import { hasRole } from '../users/roles'

const handler: PayloadHandler = async (req) => {
  if (!hasRole(req.user, 'owner')) {
    return Response.json({ error: 'owner only' }, { status: 403 })
  }
  const id = req.routeParams?.id
  if (typeof id !== 'string' && typeof id !== 'number') {
    return Response.json({ error: 'missing lead id' }, { status: 400 })
  }

  const lead = await req.payload.findByID({
    collection: 'leads',
    id,
    depth: 0,
    overrideAccess: false,
    user: req.user,
    req,
  })
  if (!lead) return Response.json({ error: 'not found' }, { status: 404 })
  if (lead.kind !== 'partnership') {
    return Response.json({ error: 'not a partnership lead' }, { status: 400 })
  }
  if (lead.partner) {
    return Response.json({ error: 'already linked' }, { status: 400 })
  }

  const contact = (lead.payload ?? {}) as Record<string, unknown>
  const partner = await req.payload.create({
    collection: 'partners',
    overrideAccess: false,
    user: req.user,
    req,
    data: {
      name: typeof contact.name === 'string' && contact.name ? contact.name : `Lead ${lead.id}`,
      kind: 'other',
      site: 'shop',
      status: 'prospect',
      contact: {
        person: typeof contact.name === 'string' ? contact.name : undefined,
        whatsapp: typeof contact.whatsapp === 'string' ? contact.whatsapp : undefined,
        email: typeof contact.email === 'string' ? contact.email : undefined,
      },
    } as never,
  })

  await req.payload.update({
    collection: 'leads',
    id: lead.id,
    overrideAccess: false,
    user: req.user,
    req,
    data: { partner: partner.id } as never,
  })

  return Response.redirect(new URL(`/admin/collections/partners/${partner.id}`, req.url), 303)
}

export const createPartnerEndpoint: Endpoint = {
  path: '/:id/create-partner',
  method: 'post',
  handler,
}
