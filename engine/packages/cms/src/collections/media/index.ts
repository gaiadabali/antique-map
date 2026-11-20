/**
 * `media` — the public images (CONTENT-MODEL.md §6; TASKS.md 8.3.a, 8.3.d, 8.3.f, 8.3.g), from the
 * shared factory (`@engine/cms-core/collections/media`: the limits, the access, what intake sets
 * once). This CMS adds the gallery's master — the capture each image is processed from, and the
 * rule that holds an image to it (`./master`) — and the derivative pipeline that runs after an
 * upload (`./pipeline`, run by `./pipeline-hook`, backfilled by `./derivatives-cli`), which knows
 * the works and products that show an image. An image uploaded for a product starts with a product
 * photo's intake filled in (`./product-defaults`).
 */
import { mediaCollection } from '@engine/cms-core/collections/media'
import type { Field } from 'payload'

import { ADMIN_GROUPS } from '@engine/cms-core/admin/groups'
import { masterField, matchItsMaster } from './master'
import { derivativesAfterUpload } from '@engine/cms-core/collections/media/pipeline-hook'
import {
  forProductField,
  productImageDefaults,
} from '@engine/cms-shop/collections/media/product-defaults'

export const Media = mediaCollection({
  group: ADMIN_GROUPS.content,
  intakeFields: [masterField, forProductField],
  // A product photo's subject, role, provenance and alt, when uploaded for a product (TASKS.md 27.1.d).
  beforeValidate: [productImageDefaults, matchItsMaster],
  // After the response: the derivatives and tiles of a new or replaced file (`./pipeline-hook`).
  afterChange: [derivativesAfterUpload],
}) satisfies { slug: 'media' }

/** The record's fields, the master among them. */
export const MEDIA_FIELDS: Field[] = Media.fields
