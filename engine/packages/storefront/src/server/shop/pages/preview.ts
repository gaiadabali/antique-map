/**
 * Who may see a shop page's draft (TASKS.md 27.5.a): a signed-in owner or editor, in Next's draft
 * mode, on the shop's own origin (the admin's, where staff cookies live).
 *
 * Two keys, both checked on every request: the draft-mode cookie (`__prerender_bypass`, set only by
 * `/api/x/preview` after it verified the same session, its value unguessable and new each build)
 * and the Payload session itself, re-verified here from the request's cookies. The cookie alone
 * shows nothing: a visitor who carries one without a staff session reads the published page, and
 * a session that ends ends the preview. The draft read then runs as that user with
 * `overrideAccess: false` (`./load-page`), so the collection's own access decides.
 */
import 'server-only'

import { draftMode, headers } from 'next/headers'

import { isCatalogueStaff } from '@engine/cms-core/access'
import { cms } from '@engine/cms/instance'

import type { DraftReader } from './load-page'

/**
 * The owner or editor whose Payload session `requestHeaders` carry, or `null` (no session, store
 * staff, a session that ended). Throws only when the CMS cannot be reached.
 */
export async function catalogueStaffOf(requestHeaders: Headers): Promise<DraftReader> {
  const payload = await cms()
  const { user } = await payload.auth({ headers: requestHeaders })
  return user && isCatalogueStaff(user as never) ? { user } : null
}

/** The staff user previewing this request, or `null` for everyone else. */
export async function previewReader(): Promise<DraftReader> {
  if (!(await draftMode()).isEnabled) return null
  try {
    return await catalogueStaffOf(new Headers(await headers()))
  } catch {
    return null
  }
}
