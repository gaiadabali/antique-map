/**
 * The audit trail's rules without a database (TASKS.md 8.3.b–c; the database proofs are
 * `./audit.db.test.ts`): who verified each drafted field is the session's user, stamped by the
 * server; a client cannot clear a draft flag or rewrite the run; the publish refusal names each
 * unchecked field in English and Indonesian.
 */
import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { unverifiedAiDraft } from '../collections/works/vocabulary'
import { publishProblems } from '../validators/work-publish'
import { stampAiDraft } from './audit'

type Doc = Record<string, unknown>
const editor = { id: 7, collection: 'users', role: 'editor' }
const owner = { id: 1, collection: 'users', role: 'owner' }

const stored = {
  cataloguing: {
    status: 'draft',
    aiDraft: {
      title: { drafted: true, verified: false, verifiedBy: null, verifiedAt: null },
      date: {
        drafted: true,
        verified: true,
        verifiedBy: 1,
        verifiedAt: '2026-10-01T09:00:00.000Z',
      },
    },
    aiDraftRun: { requestedBy: 7, requestedAt: '2026-10-01T08:00:00.000Z', record: { model: 'm' } },
  },
}

function save(data: Doc, api: 'REST' | 'local', user: unknown = editor): Doc {
  const req = { payloadAPI: api, user } as unknown as PayloadRequest
  return (stampAiDraft as unknown as (args: object) => Doc)({
    data,
    operation: 'update',
    originalDoc: stored,
    req,
  })
}
const draftOf = (doc: Doc) => (doc.cataloguing as { aiDraft: Record<string, Doc> }).aiDraft

describe('the drafting audit trail (8.3.b)', () => {
  it('stamps the verifier from the session when the box is ticked, whatever the client says', () => {
    const before = Date.now()
    const out = save(
      {
        cataloguing: {
          aiDraft: {
            title: { verified: true, verifiedBy: 1, verifiedAt: '2000-01-01T00:00:00.000Z' },
          },
        },
      },
      'REST',
    )
    const title = draftOf(out).title!
    expect(title).toMatchObject({ drafted: true, verified: true, verifiedBy: 7 })
    expect(Date.parse(String(title.verifiedAt))).toBeGreaterThanOrEqual(before)
    // Already verified by the owner: kept as it was.
    expect(draftOf(out).date).toMatchObject({
      verifiedBy: 1,
      verifiedAt: '2026-10-01T09:00:00.000Z',
    })
  })

  it('never lets a client clear a draft flag, set one, or rewrite who asked for the run', () => {
    const out = save(
      {
        cataloguing: {
          aiDraft: { title: { drafted: false }, places: { drafted: true } },
          aiDraftRun: { requestedBy: 1, requestedAt: '2000-01-01T00:00:00.000Z' },
        },
      },
      'REST',
    )
    expect(draftOf(out).title).toMatchObject({ drafted: true, verified: false })
    expect(draftOf(out).places).toMatchObject({ drafted: false })
    expect((out.cataloguing as Doc).aiDraftRun).toEqual(stored.cataloguing.aiDraftRun)
    expect(unverifiedAiDraft(draftOf(out))).toEqual(['title'])
  })

  it('clears who and when once the box is unticked', () => {
    const out = save({ cataloguing: { aiDraft: { date: { verified: false } } } }, 'REST', owner)
    expect(draftOf(out).date).toEqual({
      drafted: true,
      verified: false,
      verifiedBy: null,
      verifiedAt: null,
    })
    expect(unverifiedAiDraft(draftOf(out))).toEqual(['title', 'date'])
  })

  it('lets nobody but the owner or an editor tick or untick a box from a client', () => {
    for (const user of [
      { id: 9, collection: 'users', role: 'store' },
      { id: 3, collection: 'customers' },
      null,
    ]) {
      const out = save(
        { cataloguing: { aiDraft: { title: { verified: true }, date: { verified: false } } } },
        'REST',
        user,
      )
      expect(draftOf(out).title).toEqual({
        drafted: true,
        verified: false,
        verifiedBy: null,
        verifiedAt: null,
      })
      expect(draftOf(out).date).toMatchObject({ verified: true, verifiedBy: 1 })
      expect(unverifiedAiDraft(draftOf(out))).toEqual(['title'])
    }
  })

  it('trusts a server write, and stamps a tick it sends without who or when', () => {
    const out = save(
      {
        cataloguing: {
          aiDraft: { places: { drafted: true, verified: false }, title: { verified: true } },
        },
      },
      'local',
    )
    expect(draftOf(out).places).toMatchObject({ drafted: true, verified: false })
    expect(draftOf(out).title).toMatchObject({ verified: true, verifiedBy: 7 })
    // A server save that does not touch the drafting fields leaves them alone.
    const untouched = { cataloguing: { status: 'catalogued' } }
    expect(save(untouched, 'local')).toBe(untouched)
  })
})

describe('the publish refusal names each unchecked field in both languages (8.3.c)', () => {
  it('lists them in English and in Indonesian', () => {
    const problem = publishProblems({
      title: 'Bali',
      objectType: 'map',
      date: { precision: 'circa' },
      hasMaker: true,
      hasPlaces: false,
      hasPrimaryPlace: false,
      images: [],
      hasGrade: true,
      aiDraft: ['objectType', 'places', 'dimensions'],
    }).find((each) => each.path === 'cataloguing.aiDraft')!
    expect(problem.message).toMatch(/An AI drafted Object type, Places and Dimensions/)
    expect(problem.message).toMatch(/AI membuat draf Jenis objek, Tempat dan Dimensi/)
    expect(problem.message).toMatch(/Verified/)
    expect(problem.message).toMatch(/Diverifikasi/)
    expect(problem.summary).not.toMatch(/,/)
  })
})
