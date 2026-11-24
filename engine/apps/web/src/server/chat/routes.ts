/**
 * The chat's route handlers as the app mounts them (`src/app/api/x/chat/**`): `@engine/chat`'s
 * handlers on this app's dependencies (`./deps`).
 */
import 'server-only'

import { mountChatRoutes } from '@engine/chat/server/routes'

import { chatDeps } from './deps'

export const { chatSessionPost, chatSessionDelete, chatMessagePost, chatConsentPost } =
  mountChatRoutes(chatDeps)
