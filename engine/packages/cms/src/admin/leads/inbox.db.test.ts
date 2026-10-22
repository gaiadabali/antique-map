/**
 * The leads inbox on a real Postgres (TASKS.md 9.1.a): owner only, defaults to New newest first,
 * and its site/kind/status filters combine. The view is called directly, as
 * `../widgets/dashboard.db.test.ts` calls its widgets — the real component, access doing the
 * scoping through `overrideAccess: false`.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../collections/users/staff.test-support'

import { LeadsInboxViewBody } from './inbox-body'

/** The row ids an inbox render shows, in order — reading the markup, not re-querying. */
function rowIds(element: unknown): number[] {
  const root = element as { props: { children: unknown } }
  const children = Array.isArray(root.props.children) ? root.props.children : [root.props.children]
  const list = children.find((child) => {
    const props = (child as { props?: { children?: unknown } } | null)?.props
    return Boolean(child) && typeof child === 'object' && Array.isArray(props?.children)
  }) as { props: { children: unknown } } | undefined
  if (!list) return []
  const rows = Array.isArray(list.props.children) ? list.props.children : [list.props.children]
  return rows
    .filter((row) => row && typeof row === 'object')
    .map((row) => Number((row as { key: unknown }).key))
}

const view = (payload: unknown, user: unknown, searchParams: Record<string, string> = {}) =>
  LeadsInboxViewBody({
    payload,
    i18n: { language: 'en' },
    searchParams,
    initPageResult: { req: { payload, user, i18n: { language: 'en' } } },
  } as never)

describe.skipIf(!server)('the leads inbox, on a real database', () => {
  let stack: StaffStack

  beforeAll(async () => {
    stack = await startStaffStack('cms_leads_inbox_test', (config, key) =>
      getPayload({ config, key }),
    )
    const make = (data: Record<string, unknown>) =>
      stack.payload.create({ collection: 'leads', data: data as never })
    await make({ kind: 'ask', site: 'gallery', source: 'form', status: 'new' })
    await make({ kind: 'sell', site: 'gallery', source: 'form', status: 'new' })
    await make({ kind: 'ask', site: 'shop', source: 'form', status: 'new' })
    await make({ kind: 'ask', site: 'gallery', source: 'form', status: 'closed' })
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  it('the inbox answers only an owner', async () => {
    const owner = await view(stack.payload, { collection: 'users', role: 'owner' })
    expect((owner as { props?: { children?: unknown } }).props?.children).not.toBe(
      'Only the owner opens the leads inbox.',
    )

    const editor = await view(stack.payload, { collection: 'users', role: 'editor' })
    expect((editor as { props: { children: unknown } }).props.children).toBe(
      'Only the owner opens the leads inbox.',
    )

    const storeUser = await view(stack.payload, {
      collection: 'users',
      role: 'store',
      store: stack.stores[0].id,
    })
    expect((storeUser as { props: { children: unknown } }).props.children).toBe(
      'Only the owner opens the leads inbox.',
    )
  })

  it('the inbox defaults to New, newest first', async () => {
    const owner = { collection: 'users', role: 'owner' }
    const element = await view(stack.payload, owner)
    const ids = rowIds(element)
    expect(ids.length).toBe(3) // the 3 "new" leads, not the closed one
    expect(ids).toEqual([...ids].sort((a, b) => b - a)) // newest (highest id) first
  })

  it('filters by site, kind and status combine', async () => {
    const owner = { collection: 'users', role: 'owner' }
    const element = await view(stack.payload, owner, {
      site: 'gallery',
      kind: 'ask',
      status: 'new',
    })
    const ids = rowIds(element)
    expect(ids.length).toBe(1)
  })
})
