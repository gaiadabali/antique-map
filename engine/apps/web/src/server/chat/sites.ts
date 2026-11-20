/**
 * The chat's one configuration per site this app serves (PLAN-V2.md §3): the gallery's and the
 * shop's prompt, tools and projection from `@engine/chat`. Until the split (phase 23) one app
 * serves both; each split app passes only its own.
 */
import 'server-only'

import { galleryChat, shopChat, type ChatSites } from '@engine/chat/server/sites'

export const CHAT_SITES: ChatSites = { gallery: galleryChat, shop: shopChat }
