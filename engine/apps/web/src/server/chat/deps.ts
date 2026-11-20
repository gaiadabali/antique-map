/**
 * The process's dependencies for `@engine/chat`: `@engine/site/chat`'s, on today's one CMS, for
 * the chat of each site this app serves (`./sites`). Moved there (TASKS.md 23.4) so the shop's own
 * app builds its chat the same way.
 */
import 'server-only'

import { siteChatDeps } from '@engine/site/chat'

import { CHAT_SITES } from './sites'

/** The one set of dependencies; a failed first build (no database yet) is retried next time. */
export const chatDeps = siteChatDeps(CHAT_SITES)
