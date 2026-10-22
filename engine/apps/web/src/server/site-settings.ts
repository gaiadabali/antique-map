/**
 * Public site-settings read for the shell (`shell/site-shell`).
 *
 * `site-settings` is owner-only: no public access. The shell's contact, hours and
 * reply promise are shown to every visitor, so this loader reads them with
 * `overrideAccess: true` and an explicit `select` of only those public fields.
 * It must never select internal fields such as `leadNotifyEmails` or the AI
 * group. The result is tagged with `settingsTag(site)` (`@engine/cache`'s
 * builder — a tag is never written by hand) because it changes rarely and is
 * safe to share between visitors.
 *
 * Build safety: this module is used only inside the request path (the root
 * layout awaits `connection()` before rendering), so `cms()` is never called at
 * `next build`. The build must therefore succeed with no `DATABASE_URL`.
 */
import 'server-only'

import type { SiteKey, SiteLocale } from '@engine/config/sites'
import { cms } from '@engine/cms/instance'
import { settingsTag } from '@engine/cache'
import { cacheTag } from 'next/cache'

export type PublicSiteSettings = {
  contact: {
    whatsapp: string | null
    email: string | null
    phone: string | null
  }
  replyPromise: string | null
  hours: string | null
  announcement: string | null
  social: readonly { platform: string; url: string }[] | null
}

const EMPTY: PublicSiteSettings = {
  contact: { whatsapp: null, email: null, phone: null },
  replyPromise: null,
  hours: null,
  announcement: null,
  social: null,
}

export async function loadSiteSettings(
  site: SiteKey,
  _locale: SiteLocale,
): Promise<PublicSiteSettings> {
  'use cache'
  cacheTag(settingsTag(site === 'gallery' ? 'gallery' : 'shop'))

  const group = site === 'gallery' ? 'gallery' : 'shop'
  try {
    const payload = await cms()
    const result = await payload.findGlobal({
      slug: 'site-settings',
      // owner-only: we must read public contact fields as super-user.
      overrideAccess: true,
      select: {
        [group]: {
          contact: { whatsapp: true, email: true, phone: true },
          replyPromise: true,
          hours: true,
          announcement: true,
          social: { platform: true, url: true },
        },
      },
    })

    const data = (result[group] ?? {}) as {
      contact?: { whatsapp?: string | null; email?: string | null; phone?: string | null } | null
      replyPromise?: string | null
      hours?: string | null
      announcement?: string | null
      social?: { platform: string; url: string }[] | null
    }
    return {
      contact: {
        whatsapp: data.contact?.whatsapp ?? null,
        email: data.contact?.email ?? null,
        phone: data.contact?.phone ?? null,
      },
      replyPromise: data.replyPromise ?? null,
      hours: data.hours ?? null,
      announcement: data.announcement ?? null,
      social: data.social ?? null,
    }
  } catch {
    return EMPTY
  }
}
