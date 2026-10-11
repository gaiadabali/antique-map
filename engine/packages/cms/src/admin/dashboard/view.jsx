/**
 * The owner's dashboard inside Payload's page frame (`../page.jsx`): the sidebar and header stay on
 * screen. The view itself is `./view-body.jsx`, split out so tests never import
 * `@payloadcms/next` (its templates pull in .css files that Node cannot load), as the leads inbox.
 */
import { AdminPage } from '../page'
import { DashboardViewBody } from './view-body'

export async function DashboardView(props) {
  return <AdminPage view={props}>{await DashboardViewBody(props)}</AdminPage>
}
