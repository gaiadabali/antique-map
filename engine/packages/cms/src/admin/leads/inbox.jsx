/**
 * The leads inbox inside Payload's page frame (`../page.jsx`): the sidebar stays on every screen.
 * The view itself is `./inbox-body.jsx`, split out so tests never import `@payloadcms/next`
 * (its templates pull in .css files that Node cannot load).
 */
import { AdminPage } from '../page'
import { LeadsInboxViewBody } from './inbox-body'

export async function LeadsInboxView(props) {
  return <AdminPage view={props}>{await LeadsInboxViewBody(props)}</AdminPage>
}
