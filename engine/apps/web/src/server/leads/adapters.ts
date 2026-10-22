/**
 * The lead service's real adapters over Payload's Local API. `leads` and `site-settings` are
 * owner-only collections no visitor reads (CONTENT-MODEL.md §7); the server writing a lead and
 * reading the owner's address is the access, so these calls pass `overrideAccess: true`, each with
 * a `select` of exactly the fields it needs (SECURITY.md; the same as the chat's store).
 */
import 'server-only'

import { adminOrigin } from '@engine/config/sites'
import type { Payload } from '@engine/cms/instance'

import type { LeadMailer } from './notify'
import type { LeadDeps } from './ports'

type Loose = (args: Record<string, unknown>) => Promise<unknown>

export function payloadLeadStore(payload: Payload): LeadDeps['store'] {
  const create = payload.create as unknown as Loose
  return {
    async create(lead) {
      const doc = (await create.call(payload, {
        collection: 'leads',
        data: {
          kind: lead.kind,
          site: lead.site,
          source: lead.source,
          status: 'new',
          payload: {
            name: lead.name,
            whatsapp: lead.whatsapp,
            email: lead.email,
            preferredChannel: lead.preferredChannel,
            message: lead.message,
            locale: lead.locale,
            consentVersion: lead.consentVersion,
            consentAt: lead.consentAt,
          },
          ...(lead.items !== undefined ? { items: [...lead.items] } : {}),
        },
        depth: 0,
        select: {},
        // Public create is refused by design (owner-only access); this is the server's one door in.
        overrideAccess: true,
      })) as { id?: unknown }
      if (typeof doc.id !== 'number' && typeof doc.id !== 'string') {
        throw new Error('the new lead could not be read back')
      }
      return { id: doc.id }
    },
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type SiteGroup = { leadNotifyEmails?: unknown; contact?: { email?: unknown } }

export function payloadLeadMailer(
  payload: Payload,
  env: Readonly<Record<string, string | undefined>> = process.env,
): LeadMailer {
  const findGlobal = payload.findGlobal as unknown as Loose
  return {
    adminOrigin: adminOrigin(env),
    log: (message) => console.warn(message),
    async recipients(site) {
      const doc = (await findGlobal.call(payload, {
        slug: 'site-settings',
        select: { [site]: { leadNotifyEmails: true, contact: { email: true } } },
        depth: 0,
        // site-settings is owner-only; the address is read by the server, never shown to a visitor.
        overrideAccess: true,
      })) as Record<string, SiteGroup | undefined>
      const group = doc[site]
      const listed = Array.isArray(group?.leadNotifyEmails) ? group.leadNotifyEmails : []
      const candidates = listed.length > 0 ? listed : [group?.contact?.email]
      return candidates.filter(
        (each): each is string => typeof each === 'string' && EMAIL.test(each),
      )
    },
    async send({ to, subject, text }) {
      await payload.sendEmail({ to: [...to].join(', '), subject, text })
    },
  }
}
