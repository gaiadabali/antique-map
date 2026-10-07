/**
 * TASKS.md 8.3.b–c on a real Postgres: after a draft, the work cannot publish until each drafted
 * field is ticked Verified — the refusal names them, in English and Indonesian — and the audit
 * trail is the server's: who asked for the run and when, who ticked each field and when, taken
 * from the session whatever a client sends. Without `CMS_TEST_POSTGRES_URL` it skips.
 */
import { invalidationBatch } from '@engine/cache'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { server } from '../collections/works/works.test-support'
import { startDraftStack, TEST_MODEL, type DraftStack } from './draft-stack.test-support'
import { FAKE_USAGE, goodReply, text } from './draft.test-support'
import { DRAFT_PROMPT_VERSION } from './prompt'

type Entry = { drafted?: boolean; verified?: boolean; verifiedBy?: unknown; verifiedAt?: unknown }
type Cataloguing = {
  aiDraft: Record<string, Entry>
  aiDraftRun: { requestedBy: unknown; requestedAt: unknown; record: Record<string, unknown> }
}

const DRAFTED = ['title', 'objectType', 'date', 'places', 'subjects', 'dimensions'] as const

describe.skipIf(!server)('the drafting audit trail and the publish gate (8.3.b–c)', () => {
  let s: DraftStack

  beforeAll(async () => {
    s = await startDraftStack('cms_ai_audit_test')
  }, 240_000)
  afterAll(() => s?.stack.stop(), 60_000)

  const cataloguingOf = async (id: number) =>
    (await s.stored(id)).cataloguing as unknown as Cataloguing
  const drafted = async () => {
    const work = await s.work()
    const response = await s.post(
      s.deps(() => text(goodReply())),
      work.id,
      'editor',
    )
    expect(response.status).toBe(200)
    return work
  }
  const patch = (id: number, role: 'owner' | 'editor', data: object, draft = true) =>
    s.stack.rest('PATCH', `/api/works/${id}${draft ? '?draft=true' : ''}`, { role, json: data })
  const verify = (id: number, role: 'owner' | 'editor', fields: readonly string[], on = true) =>
    patch(id, role, {
      cataloguing: {
        aiDraft: Object.fromEntries(fields.map((field) => [field, { verified: on }])),
      },
    })

  it('publishing is refused naming each unverified field, then allowed once each is verified', async () => {
    const work = await drafted()
    const refused = await patch(work.id, 'editor', { _status: 'published' }, false)
    expect(refused.status).toBe(400)
    const words = JSON.stringify(await refused.json())
    expect(words).toMatch(
      /An AI drafted Title, Object type, Date, Places, Subjects and Dimensions, and nobody has checked them yet/,
    )
    expect(words).toMatch(/AI membuat draf Judul, Jenis objek, Tanggal, Tempat, Subjek dan Dimensi/)

    // All but one checked: the refusal names the one left.
    expect((await verify(work.id, 'editor', DRAFTED.slice(0, -1))).status).toBe(200)
    const one = await patch(work.id, 'editor', { _status: 'published' }, false)
    expect(one.status).toBe(400)
    const left = JSON.stringify(await one.json())
    expect(left).toMatch(/An AI drafted Dimensions, and nobody has checked it yet/)
    expect(left).toMatch(/AI membuat draf Dimensi dan/)
    expect(left).not.toMatch(/drafted Title/)

    expect((await verify(work.id, 'editor', ['dimensions'])).status).toBe(200)
    const editor = {
      ...(await s.stack.api.findByID({ collection: 'users', id: s.userIds.editor })),
      collection: 'users',
    }
    const published = await invalidationBatch().operation((context) =>
      s.stack.api.update({
        collection: 'works',
        id: work.id,
        data: { _status: 'published' },
        overrideAccess: false,
        user: editor,
        context,
      }),
    )
    expect(published._status).toBe('published')
  }, 90_000)

  it('the audit trail records the requester and each verifier', async () => {
    const before = Date.now()
    const work = await drafted()
    const run = (await cataloguingOf(work.id)).aiDraftRun
    expect(run.requestedBy).toBe(s.userIds.editor)
    expect(Date.parse(String(run.requestedAt))).toBeGreaterThanOrEqual(before - 1000)
    expect(run.record).toMatchObject({
      model: TEST_MODEL,
      promptVersion: DRAFT_PROMPT_VERSION,
      imageIds: s.images,
      usage: FAKE_USAGE,
      filled: [...DRAFTED],
      output: { title: { value: 'Insula Bali, after Valentijn' } },
    })

    // The editor ticks the title — and tries to say the owner did it, long ago, to clear the
    // date's draft flag, and to rewrite who asked for the run. Only the tick lands.
    const forged = await patch(work.id, 'editor', {
      cataloguing: {
        aiDraft: {
          title: {
            verified: true,
            verifiedBy: s.userIds.owner,
            verifiedAt: '2000-01-01T00:00:00.000Z',
          },
          date: { drafted: false },
        },
        aiDraftRun: { requestedBy: s.userIds.owner, requestedAt: '2000-01-01T00:00:00.000Z' },
      },
    })
    expect(forged.status).toBe(200)
    let cataloguing = await cataloguingOf(work.id)
    expect(cataloguing.aiDraft.title).toMatchObject({
      verified: true,
      verifiedBy: s.userIds.editor,
    })
    expect(Date.parse(String(cataloguing.aiDraft.title!.verifiedAt))).toBeGreaterThanOrEqual(
      before - 1000,
    )
    expect(cataloguing.aiDraft.date).toMatchObject({
      drafted: true,
      verified: false,
      verifiedBy: null,
    })
    expect(cataloguing.aiDraftRun).toMatchObject({
      requestedBy: s.userIds.editor,
      requestedAt: run.requestedAt,
    })

    // The owner ticks the date; the title keeps its own verifier.
    expect((await verify(work.id, 'owner', ['date'])).status).toBe(200)
    cataloguing = await cataloguingOf(work.id)
    expect(cataloguing.aiDraft.date).toMatchObject({ verified: true, verifiedBy: s.userIds.owner })
    expect(cataloguing.aiDraft.title).toMatchObject({
      verified: true,
      verifiedBy: s.userIds.editor,
    })

    // Unticked, the record of who checked it goes with the tick; the work is unverified again.
    expect((await verify(work.id, 'owner', ['title'], false)).status).toBe(200)
    cataloguing = await cataloguingOf(work.id)
    expect(cataloguing.aiDraft.title).toMatchObject({
      drafted: true,
      verified: false,
      verifiedBy: null,
      verifiedAt: null,
    })

    // A REST save cannot make a field drafted either: only the drafting tool does.
    const plain = await s.work({ title: 'Typed by hand' })
    expect(
      (await patch(plain.id, 'editor', { cataloguing: { aiDraft: { title: { drafted: true } } } }))
        .status,
    ).toBe(200)
    expect((await cataloguingOf(plain.id)).aiDraft.title).toMatchObject({ drafted: false })
  }, 90_000)
})
