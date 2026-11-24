/**
 * Test support only — a throwaway database with this CMS's schema pushed onto it
 * (`@engine/cms-core/db/pushed-database`, bound to this CMS by `../../db/test-cms`).
 */
import '../../db/test-cms.test-support'

export * from '@engine/cms-core/db/pushed-database'
