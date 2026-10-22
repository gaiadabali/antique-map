/**
 * The seed screen at `/admin/seeds`: owner only. The server part checks the role and hands the
 * language to the buttons (`./client.jsx`), which post to `POST /api/x/seed` and follow the run
 * with `GET` (the app's `(payload)/admin/seeds/runner`, which also refuses production).
 * `.jsx`: see `../leads/shared.jsx`'s header.
 */
import { roleOf } from '../../collections/users/roles'
import { Notice } from '../leads/shared'
import { AdminPage } from '../page'
import { SeedsClient } from './client'
import { L } from './copy'

/** The view inside Payload's page frame (`../page.jsx`): the sidebar stays on every screen. */
export async function SeedsView(props) {
  return <AdminPage view={props}>{await SeedsViewBody(props)}</AdminPage>
}

async function SeedsViewBody(props) {
  const req = props.initPageResult?.req
  const language = props.i18n?.language === 'id' ? 'id' : 'en'
  if (roleOf(req?.user) !== 'owner') {
    return <Notice tone="error">{L('refusalNotOwner', language)}</Notice>
  }
  return (
    <main className="ix-page">
      <h1 className="ix-title">{L('title', language)}</h1>
      <p className="ix-muted ix-intro">{L('intro', language)}</p>
      <SeedsClient language={language} />
    </main>
  )
}
