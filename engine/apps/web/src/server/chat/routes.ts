/**
 * The chat's route handlers as the app mounts them (`src/app/api/x/chat/**`). Each resolves the
 * process's dependencies on its first request and answers a failure it did not expect with a
 * plain `503 unavailable` — never a stack, a key or a request body (SECURITY.md L1).
 */
import 'server-only'

import type { ChatDeps } from './context'
import { chatDeps } from './deps'
import { postConsent } from './http/consent'
import { postMessage } from './http/message'
import { jsonResponse } from './http/respond'
import { deleteSession, startSession } from './http/session'

type Handler = (request: Request, deps: ChatDeps) => Promise<Response>

function mount(handler: Handler) {
  return async (request: Request): Promise<Response> => {
    try {
      return await handler(request, await chatDeps())
    } catch (error) {
      console.error(
        `[chat] ${new URL(request.url).pathname} failed: ${error instanceof Error ? error.name : 'error'}`,
      )
      return jsonResponse({ error: { code: 'unavailable', message: 'unavailable' } }, 503)
    }
  }
}

export const chatSessionPost = mount(startSession)
export const chatSessionDelete = mount(deleteSession)
export const chatMessagePost = mount(postMessage)
export const chatConsentPost = mount(postConsent)
