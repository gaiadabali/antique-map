/**
 * Field access and the roles on `users`, on a real Postgres over REST (TASKS.md 10.1.a; SECURITY.md
 * R3, R5, R7, A1, A7): what the table in §2.2 says about single fields — the owner's asking price
 * and acquisition cost, the staff-only `physical` — and that roles and the store are the owner's to
 * change. Sign-in and the browser rules are `./sign-in.db.test.ts`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { server, startSecurityStack, type SecurityStack } from './support/stack'

describe.skipIf(!server)('fields and the roles on users, on a real database', () => {
  let stack: SecurityStack

  beforeAll(async () => {
    stack = await startSecurityStack('security_auth')
  }, 240_000)
  afterAll(() => stack?.stop(), 60_000)

  const work = () => stack.work.published.id
  const read = (
    as: Parameters<SecurityStack['rest']>[2] extends infer T
      ? T extends { as?: infer W }
        ? W
        : never
      : never,
  ) => stack.rest('GET', `/api/works/${work()}?depth=0`, { as })
  /** The work as the Local API reads it with access overridden: the truth under the REST filter. */
  const truth = () =>
    stack.api.findByID({ collection: 'works', id: work(), depth: 0, overrideAccess: true })

  describe('fields (§2.2: works.askingPrice, physical, acquisition)', () => {
    it('the asking price is the owner’s alone to read', async () => {
      expect((await read('owner')).body).toMatchObject({ askingPrice: 18_000 })
      expect((await read('editor')).body).not.toHaveProperty('askingPrice')
      expect((await read('anonymous')).body).not.toHaveProperty('askingPrice')
      expect([401, 403]).toContain((await read('storeA')).status)
    })

    it('an editor’s write of the asking price or the acquisition cost changes nothing, while the title and the export status land', async () => {
      const editor = { ...stack.users.editor, collection: 'users' }
      type Now = {
        title: string
        askingPrice?: number
        physical?: { exportStatus?: string; acquisition?: { cost?: { amount?: number } } }
      }
      // Through REST (the cache hook of a committed save needs a request scope this harness lacks,
      // so the answer may be a 500 after the write: the stored row is what is judged).
      await stack.rest('PATCH', `/api/works/${work()}`, {
        as: 'editor',
        json: {
          askingPrice: 1,
          physical: { acquisition: { cost: { amount: 1, currency: 'USD' } } },
        },
      })
      // Through the Local API as the editor, access enforced: a control write that must land
      // (so the proof below is not vacuous) beside the forbidden ones that must not.
      await stack.api.update({
        collection: 'works',
        id: work(),
        user: editor,
        overrideAccess: false,
        data: {
          title: 'Edited by the editor',
          askingPrice: 1,
          physical: {
            exportStatus: 'permit-pending',
            acquisition: { cost: { amount: 1, currency: 'USD' } },
          },
        },
      })
      const now = (await truth()) as Now
      expect(now.title, 'the editor’s allowed write landed').toBe('Edited by the editor')
      expect(now.physical?.exportStatus).toBe('permit-pending')
      expect(now.askingPrice).toBe(18_000)
      expect(now.physical?.acquisition?.cost?.amount).toBe(1_500_000)
    })

    it('`physical` is the owner’s and the editors’; the acquisition is the owner’s alone', async () => {
      const owner = (await read('owner')).body as { physical?: Record<string, unknown> }
      expect(owner.physical).toHaveProperty('acquisition')
      const editor = (await read('editor')).body as { physical?: Record<string, unknown> }
      expect(editor.physical).toHaveProperty('exportStatus')
      expect(editor.physical).not.toHaveProperty('acquisition')
      expect((await read('anonymous')).body).not.toHaveProperty('physical')
    })

    it('a draft is a 404 to the public, and the version history is staff only', async () => {
      const id = stack.work.draft.id
      expect((await stack.rest('GET', `/api/works/${id}`)).status).toBe(404)
      expect([401, 403]).toContain((await stack.rest('GET', '/api/works/versions')).status)
      expect([401, 403]).toContain(
        (await stack.rest('GET', '/api/works/versions', { as: 'storeA' })).status,
      )
      expect((await stack.rest('GET', '/api/works/versions', { as: 'editor' })).status).toBe(200)
    })
  })

  describe('users (R7, A7): roles and the store are the owner’s to change', () => {
    const own = (who: 'editor' | 'storeA') => stack.users[who].id
    const userNow = async (id: number) =>
      (await stack.api.findByID({ collection: 'users', id, depth: 0, overrideAccess: true })) as {
        role?: string
        store?: number | { id: number } | null
      }

    it('a store user cannot make themselves an owner or move themselves to another store', async () => {
      await stack.rest('PATCH', `/api/users/${own('storeA')}`, {
        as: 'storeA',
        json: { role: 'owner', store: stack.stores.B.id },
      })
      const now = await userNow(own('storeA'))
      expect(now.role).toBe('store')
      const store = typeof now.store === 'object' ? now.store?.id : now.store
      expect(store).toBe(stack.stores.A.id)
    })

    it('an editor cannot make themselves an owner', async () => {
      await stack.rest('PATCH', `/api/users/${own('editor')}`, {
        as: 'editor',
        json: { role: 'owner' },
      })
      expect((await userNow(own('editor'))).role).toBe('editor')
    })

    it('the last owner can neither lose the role nor be deleted (A7)', async () => {
      const owner = stack.users.owner.id
      await stack.rest('PATCH', `/api/users/${owner}`, { as: 'owner', json: { role: 'editor' } })
      expect((await userNow(owner)).role).toBe('owner')
      await stack.rest('DELETE', `/api/users/${owner}`, { as: 'owner' })
      expect((await userNow(owner)).role).toBe('owner')
    })

    it('records a role or store change the owner makes: who, when, from, to — and shows it to the owner alone (R7)', async () => {
      const target = stack.seeded.users!.id
      const before = (await stack.api.findByID({
        collection: 'users',
        id: target,
        depth: 0,
        overrideAccess: true,
      })) as {
        accessChanges?: unknown[]
      }
      const was = before.accessChanges?.length ?? 0
      const changed = await stack.rest('PATCH', `/api/users/${target}`, {
        as: 'owner',
        json: { store: stack.stores.A.id },
      })
      expect(changed.status).toBe(200)
      const asOwner = await stack.rest('GET', `/api/users/${target}?depth=0`, { as: 'owner' })
      const history =
        (asOwner.body as { accessChanges?: Array<Record<string, unknown>> }).accessChanges ?? []
      expect(history.length).toBe(was + 1)
      expect(history.at(-1)).toMatchObject({ by: stack.users.owner.id })
      expect(history.at(-1)).toHaveProperty('at')
      // The editor's own account was recorded when it was made (the owner sees that row), yet an
      // editor reading it gets no history: Payload answers a hidden array as an empty one.
      const editorId = stack.users.editor.id
      const seenByOwner = await stack.rest('GET', `/api/users/${editorId}?depth=0`, { as: 'owner' })
      expect(
        ((seenByOwner.body as { accessChanges?: unknown[] }).accessChanges ?? []).length,
      ).toBeGreaterThan(0)
      const seenByEditor = await stack.rest('GET', `/api/users/${editorId}?depth=0`, {
        as: 'editor',
      })
      expect((seenByEditor.body as { accessChanges?: unknown[] }).accessChanges ?? []).toEqual([])
    })

    it('only `users` sign in, with the three roles of the table (A1)', () => {
      const withAuth = stack.config.collections
        .filter((collection) => collection.auth)
        .map((c) => c.slug)
      expect(withAuth).toEqual(['users'])
      const role = stack.config.collections
        .find((collection) => collection.slug === 'users')!
        .fields.find((field) => 'name' in field && field.name === 'role') as {
        options?: Array<{ value: string }>
      }
      expect(role.options?.map((option) => option.value).sort()).toEqual([
        'editor',
        'owner',
        'store',
      ])
    })
  })
})
