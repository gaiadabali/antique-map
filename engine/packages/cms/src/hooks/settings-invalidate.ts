/**
 * The one global holds a group per site, so a `site-settings` save expires both sites'
 * `settings:<site>` tags (`@engine/cms-core/hooks` `invalidatingSettings`): a cached read
 * (`apps/web/src/server/site-settings.ts`) would otherwise keep the old contact, WhatsApp number
 * and AI flags until its own expiry — found on staging, 2026-10-06.
 */
import { settingsTag } from '@engine/cache'
import { invalidatingSettings } from '@engine/cms-core/hooks'

export const SETTINGS_TAGS = [settingsTag('gallery'), settingsTag('shop')] as const

export const invalidateSettingsOnChange = invalidatingSettings(SETTINGS_TAGS)
