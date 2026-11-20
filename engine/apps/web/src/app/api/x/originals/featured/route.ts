/** `GET /api/x/originals/featured` — two published, pictured works for the shop home (23.5.c). */
import { originalsRoute } from '@engine/site/originals/route'

import { galleryOriginals } from '../../../../../server/gallery/originals/reads'

export const GET = originalsRoute(galleryOriginals).featured
