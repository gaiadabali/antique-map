/**
 * A `site-settings` save expires what the sites were shown of it (ARCHITECTURE.md §9, §15;
 * CONVENTIONS.md §12): both sites' `settings:<site>` tags, through `@engine/cache`'s
 * `invalidate(tags)` — after the commit, never on the spot (see `./work-invalidate`'s header). The
 * global holds a group per site; a save may touch either, so both are expired. Without this hook a
 * cached read (`apps/web/src/server/site-settings.ts`) kept serving the old contact, WhatsApp
 * number and AI flags until its own expiry — found on staging, 2026-10-06.
 */
import { invalidate, settingsTag } from '@engine/cache'
import type { GlobalAfterChangeHook } from 'payload'

export const SETTINGS_TAGS = [settingsTag('gallery'), settingsTag('shop')] as const

export const invalidateSettingsOnChange: GlobalAfterChangeHook = ({ doc, context }) => {
  invalidate(SETTINGS_TAGS, context)
  return doc
}
