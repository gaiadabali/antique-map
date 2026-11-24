/**
 * `chat-sessions` — visitor AI chat transcripts (CONTENT-MODEL.md §6; AI.md §3.4), from the shared
 * factory (`@engine/cms-core/collections/chat-sessions`): written by the chat only, deleted 30 days
 * after the last message, owner-only. This one CMS keeps both sites' sessions, so each names its
 * site.
 */
import { chatSessionsCollection } from '@engine/cms-core/collections/chat-sessions'

import { ADMIN_GROUPS } from '@engine/cms-core/admin/groups'
import { recordSiteField } from '../../fields/site'

export { CHAT_SESSIONS_ACCESS } from '@engine/cms-core/collections/chat-sessions'

export const ChatSessions = chatSessionsCollection({
  group: ADMIN_GROUPS.settings,
  site: recordSiteField(),
}) satisfies { slug: 'chat-sessions' }
