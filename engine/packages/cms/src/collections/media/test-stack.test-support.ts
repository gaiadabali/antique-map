/**
 * Test support only — the storage tests' stack (Postgres and the dev MinIO) on this CMS's schema
 * (`@engine/cms-core/db/media-stack`, bound by `../../db/test-cms`).
 */
import '../../db/test-cms.test-support'

export * from '@engine/cms-core/db/media-stack'
