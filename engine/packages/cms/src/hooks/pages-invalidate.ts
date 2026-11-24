/**
 * A page's change expires what its site showed of it (`@engine/cms-core/hooks`
 * `pagesInvalidation`): in this one CMS each page names its site, and a page moved from one site to
 * the other expires both.
 */
import { pagesInvalidation } from '@engine/cms-core/hooks'

const hooks = pagesInvalidation()

export const invalidatePagesOnChange = hooks.afterChange
export const invalidatePagesOnDelete = hooks.afterDelete
