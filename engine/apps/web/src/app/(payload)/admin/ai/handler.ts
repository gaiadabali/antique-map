/**
 * The server half of the admin's "Draft from photographs" action (TASKS.md 8.3), mounted at
 * `POST /api/x/draft` (`src/app/api/x/draft/route.ts`). It lives beside the admin it serves, under
 * `(payload)/`, where the app may import the CMS (CONVENTIONS.md §5): `@engine/cms/ai`
 * `handleDraftPost` does the work with this process's dependencies (`./deps`).
 */
import 'server-only'

import { handleDraftPost } from '@engine/cms/ai'

import { draftDeps } from './deps'

export async function postDraft(request: Request): Promise<Response> {
  return handleDraftPost(request, await draftDeps())
}
