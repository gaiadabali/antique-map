/**
 * The Catalogue Wall as its own admin view at `/admin/wall` (TASKS.md 27.6.a moved it off the
 * home): `./view.jsx` inside Payload's page frame (`../page.jsx`), kept apart so the wall's db test
 * loads the wall without Payload's templates. `.jsx`: see `../leads/shared.jsx`'s header.
 */
import { AdminPage } from '@engine/cms-core/admin/page'
import { CatalogueWall } from './view'

export async function CatalogueWallView(props) {
  return <AdminPage view={props}>{await CatalogueWall(props)}</AdminPage>
}
