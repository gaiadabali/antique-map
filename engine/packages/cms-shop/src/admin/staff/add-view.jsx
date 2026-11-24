/**
 * "Add a staff member" at `/admin/staff/new` (TASKS.md 27.6.c; the plan's §3.9, without the email
 * invitation — the user chose, 2026-11-09, that the owner sets the first password): one short
 * screen in the admin's own look, the owner's alone. The server part checks the role and reads the
 * stores as the owner; the form (`./add-client.jsx`) saves through Payload's own REST create, so the
 * collection's rules decide. Payload's full "Create new" form stays for anything rarer.
 * `.jsx`: see `../leads/shared.jsx`'s header.
 */
import { roleOf } from '@engine/cms-core/access'

import { Notice } from '@engine/cms-core/admin/shared'
import { AdminPage } from '@engine/cms-core/admin/page'
import { AddStaffClient } from './add-client'
import { S } from './copy'

/** The view inside Payload's page frame (`../page.jsx`): the sidebar stays on every screen. */
export async function AddStaffView(props) {
  return <AdminPage view={props}>{await AddStaffBody(props)}</AdminPage>
}

async function storesOf(req) {
  try {
    const found = await req.payload.find({
      collection: 'stores',
      overrideAccess: false,
      user: req.user,
      depth: 0,
      limit: 0,
      pagination: false,
      sort: 'name',
      select: { name: true, code: true, area: true },
    })
    return found.docs.map((store) => ({
      id: store.id,
      label: store.code ? `${store.name} (${store.code})` : String(store.name ?? store.id),
      area: typeof store.area === 'string' ? store.area : '',
    }))
  } catch {
    return []
  }
}

async function AddStaffBody(props) {
  const req = props.initPageResult?.req
  const language = props.i18n?.language === 'id' ? 'id' : 'en'
  if (roleOf(req?.user) !== 'owner') {
    return (
      <main className="ix-page">
        <Notice tone="error">{S('refusal', language)}</Notice>
      </main>
    )
  }
  const stores = await storesOf(req)
  // `?store=<id>`: "Add staff for this store" on a store's page arrives with it chosen.
  const wanted = String((await props.searchParams)?.store ?? '')
  return (
    <main className="ix-page">
      <h1 className="ix-title">{S('title', language)}</h1>
      <p className="ix-muted ix-intro">{S('intro', language)}</p>
      <AddStaffClient
        language={language}
        stores={stores}
        initialStore={stores.some((each) => String(each.id) === wanted) ? wanted : ''}
      />
    </main>
  )
}
