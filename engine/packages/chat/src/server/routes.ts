/**
 * The chat's route handlers, mounted on the app's dependencies (`src/app/api/x/chat/**`). Each
 * resolves the process's dependencies on its first request and answers a failure it did not
 * expect with a plain `503 unavailable` — never a stack, a key or a request body (SECURITY.md L1).
 */
import 'server-only'

import type { ChatDeps } from './context'
import { postConsent } from './http/consent'
import { postMessage } from './http/message'
import { jsonResponse } from './http/respond'
import { deleteSession, startSession } from './http/session'

type Handler = (request: Request, deps: ChatDeps) => Promise<Response>
export type ChatRoute = (request: Request) => Promise<Response>

/** The four handlers on `deps`, the app's builder of its one set of dependencies. */
export function mountChatRoutes(deps: () => Promise<ChatDeps>): {
  readonly chatSessionPost: ChatRoute
  readonly chatSessionDelete: ChatRoute
  readonly chatMessagePost: ChatRoute
  readonly chatConsentPost: ChatRoute
} {
  const mount =
    (handler: Handler): ChatRoute =>
    async (request) => {
      try {
        return await handler(request, await deps())
      } catch (error) {
        console.error(
          `[chat] ${new URL(request.url).pathname} failed: ${error instanceof Error ? error.name : 'error'}`,
        )
        return jsonResponse({ error: { code: 'unavailable', message: 'unavailable' } }, 503)
      }
    }
  return {
    chatSessionPost: mount(startSession),
    chatSessionDelete: mount(deleteSession),
    chatMessagePost: mount(postMessage),
    chatConsentPost: mount(postConsent),
  }
}
