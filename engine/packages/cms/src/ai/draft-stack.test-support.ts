/**
 * Test support only — imported by `*.db.test.ts` here, never by runtime code.
 *
 * The drafting tool on a real database (TASKS.md 8.3): the works stack (`../collections/works/
 * works.test-support`) with drafting switched on, each role signed in for `/api/x/draft`, and a
 * work ready to draft — credited, graded, photographed, its draftable fields empty.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'

import {
  PASSWORD,
  ROLES,
  startWorksStack,
  vocabulary,
  type Role,
  type WorksStack,
} from '../collections/works/works.test-support'
import type { DraftDeps } from './draft'
import { fakeImages, ScriptedDraftModel, type DraftScript } from './draft.test-support'
import { handleDraftPost } from './http'
import { DraftLimiter } from './limits'

export const TEST_MODEL = 'claude-test-model'

export type DraftStack = {
  stack: WorksStack
  ids: Awaited<ReturnType<typeof vocabulary>>
  images: number[]
  userIds: Record<Role, number>
  /** Fresh deps around `script`; every photograph "shows" `writing`. */
  deps(script: DraftScript, writing?: string): DraftDeps & { model: ScriptedDraftModel }
  /** `POST /api/x/draft` as `role` (anonymous when none). */
  post(deps: DraftDeps, workId: number, role?: Role): Promise<Response>
  /** A work with nothing drafted yet, ready to publish once title, type, date and place are in. */
  work(data?: Record<string, unknown>): Promise<{ id: number }>
  stored(id: number): Promise<Record<string, unknown>>
  setDrafting(on: boolean): Promise<unknown>
}

export async function startDraftStack(prefix: string): Promise<DraftStack> {
  const stack = await startWorksStack(prefix, (config, key) => getPayload({ config, key }))
  const ids = await vocabulary(stack.api)
  const images = [await stack.media('recto'), await stack.media('verso')]
  const tokens = new Map<Role, string>()
  const userIds = {} as Record<Role, number>
  for (const role of ROLES) {
    const response = await stack.rest('POST', '/api/users/login', {
      json: { email: `${role}@works.test`, password: PASSWORD },
    })
    const body = (await response.json()) as { token: string; user: { id: number } }
    tokens.set(role, body.token)
    userIds[role] = body.user.id
  }
  const setDrafting = (on: boolean) =>
    invalidationBatch().operation((context) =>
      stack.payload.updateGlobal({
        slug: 'site-settings',
        data: { gallery: { ai: { draftingEnabled: on } } },
        context,
      } as Parameters<typeof stack.payload.updateGlobal>[0]),
    )
  await setDrafting(true)

  return {
    stack,
    ids,
    images,
    userIds,
    setDrafting,
    deps(script, writing = 'An engraved map of an island') {
      return {
        payload: stack.payload,
        model: new ScriptedDraftModel(script),
        images: fakeImages(() => writing),
        modelId: TEST_MODEL,
        limiter: new DraftLimiter(),
        withWrites: (run) => invalidationBatch().operation(run),
      }
    },
    post(deps, workId, role) {
      const headers = new Headers({ 'content-type': 'application/json' })
      const token = role ? tokens.get(role) : undefined
      if (token) headers.set('authorization', `JWT ${token}`)
      const request = new Request('http://localhost/api/x/draft', {
        method: 'POST',
        headers,
        body: JSON.stringify({ workId }),
      })
      return handleDraftPost(request, deps)
    },
    work(data = {}) {
      return stack.api.create({
        collection: 'works',
        data: {
          makers: [{ maker: ids.maker, role: 'cartographer', certainty: 'attributed' }],
          condition: { grade: ids.grade },
          images: images.map((media) => ({ media })),
          ...data,
        },
      })
    },
    stored(id) {
      return stack.api.findByID({ collection: 'works', id, draft: true, depth: 0 })
    },
  }
}
