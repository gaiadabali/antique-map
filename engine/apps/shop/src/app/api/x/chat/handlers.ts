/**
 * The shop's chat (AI.md; TASKS.md 23.4): `@engine/chat`'s handlers on this app's own CMS
 * (`@engine/site/chat`), with the shop's configuration alone — its prompt, tools and catalogue, and
 * its card linking to the gallery of originals. Each `chat/**` route re-exports one.
 */
import 'server-only'

import { shopChat } from '@engine/chat/server/sites'
import { chatRoutesFor } from '@engine/site/chat'

export const { chatSessionPost, chatSessionDelete, chatMessagePost, chatConsentPost } =
  chatRoutesFor({ shop: shopChat })
