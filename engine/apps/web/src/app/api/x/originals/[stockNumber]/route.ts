/** `GET /api/x/originals/{stockNumber}` — one published work, projected (TASKS.md 23.5.a). */
import { originalsRoute } from '@engine/site/originals/route'

import { galleryOriginals } from '../../../../../server/gallery/originals/reads'

const route = originalsRoute(galleryOriginals)

export async function GET(
  request: Request,
  { params }: RouteContext<'/api/x/originals/[stockNumber]'>,
): Promise<Response> {
  return route.byStockNumber(request, (await params).stockNumber)
}
