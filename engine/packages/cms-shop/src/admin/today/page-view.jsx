/**
 * "Today" as its own admin view at `/admin/today` (the home took Payload's dashboard look,
 * 2026-11-16): `./view.jsx` inside Payload's page frame (`../page.jsx`), as the wall's
 * `page-view.jsx`. `.jsx`: see `../leads/shared.jsx`'s header.
 */
import { AdminPage } from '@engine/cms-core/admin/page'
import { TodayView } from './view'

export async function TodayPageView(props) {
  return <AdminPage view={props}>{await TodayView(props)}</AdminPage>
}
