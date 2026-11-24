/**
 * `@engine/site/chat` — an app's chat on its own CMS (TASKS.md 23.4): `@engine/chat`'s four route
 * handlers on the dependencies `./deps` builds for the sites the app serves. Each app mounts them
 * once, from its `src/app/api/x/chat/**` route files:
 *
 *   export const { chatSessionPost, … } = chatRoutesFor({ shop: shopChat })
 *
 * Importing this opens nothing: the first request builds the dependencies.
 */
import 'server-only'

import { mountChatRoutes } from '@engine/chat/server/routes'
import type { ChatSites } from '@engine/chat/server/sites'

import { siteChatDeps } from './deps'

export { onlySiteOf, siteChatDeps } from './deps'

/** The chat's route handlers for `sites`, on one lazily built set of dependencies. */
export function chatRoutesFor(sites: ChatSites) {
  return mountChatRoutes(siteChatDeps(sites))
}
