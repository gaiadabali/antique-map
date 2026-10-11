/**
 * The drafting fields show only what was drafted (TASKS.md 16): an entry once its field was
 * drafted, the block when any was, the run once there was one. Display only — the publish guard
 * and the audit read the data (`./audit`), so these conditions can only hide, never unlock.
 */
import type { Field, GroupField } from 'payload'
import { describe, expect, it } from 'vitest'

import { AI_DRAFTABLE_FIELDS } from '../collections/works/vocabulary'
import { aiDraftField, aiDraftRunField } from './fields'

type Condition = (data: unknown, siblingData: unknown, context: unknown) => boolean

const shows = (field: { admin?: unknown }, siblingData: unknown): boolean =>
  (field.admin as { condition: Condition }).condition({}, siblingData, {})

const entry = (name: string): GroupField =>
  aiDraftField.fields.find((field: Field) => 'name' in field && field.name === name) as GroupField

describe('the drafting fields on a work', () => {
  const [first, second] = AI_DRAFTABLE_FIELDS

  it('show no block on a hand-catalogued work, and the block once any field was drafted', () => {
    expect(shows(aiDraftField, {})).toBe(false)
    expect(shows(aiDraftField, { aiDraft: {} })).toBe(false)
    expect(shows(aiDraftField, { aiDraft: { [first!]: { drafted: false } } })).toBe(false)
    expect(shows(aiDraftField, { aiDraft: { [second!]: { drafted: true } } })).toBe(true)
  })

  it("show a field's checks only when that field was drafted, verified or not", () => {
    const aiDraft = { [first!]: { drafted: true, verified: true }, [second!]: { drafted: false } }
    expect(shows(entry(first!), aiDraft)).toBe(true)
    expect(shows(entry(second!), aiDraft)).toBe(false)
    expect(shows(entry(second!), null)).toBe(false)
  })

  it('show the last run once there was one', () => {
    expect(shows(aiDraftRunField, {})).toBe(false)
    expect(shows(aiDraftRunField, { aiDraftRun: { requestedAt: '2026-10-11T09:00:00Z' } })).toBe(
      true,
    )
  })
})
