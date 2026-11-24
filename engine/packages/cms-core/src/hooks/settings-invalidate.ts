/**
 * A `site-settings` save expires what a site was shown of it (ARCHITECTURE.md §9, §15;
 * CONVENTIONS.md §12): the CMS's `settings:<site>` tags, through `@engine/cache`'s
 * `invalidate(tags)` — after the commit, never on the spot. A save may touch any group of the
 * global, so every tag the CMS names is expired. Without it a cached read of the settings kept
 * serving the old contact, WhatsApp number and AI flags until its own expiry — found on staging,
 * 2026-10-06.
 */
import { invalidate, type CacheTag } from '@engine/cache'
import type { GlobalAfterChangeHook } from 'payload'

/** The global's `afterChange` hook, expiring `tags` on every save. */
export function invalidatingSettings(tags: readonly CacheTag[]): GlobalAfterChangeHook {
  return ({ doc, context }) => {
    invalidate(tags, context)
    return doc
  }
}
