/**
 * `@engine/site/seo`: a page's metadata and its JSON-LD, the robots and sitemap builders, the same
 * for both sites (PLAN-V2 §4.2). The root files' route handlers are `@engine/site/seo/routes`; the
 * sitemap sources' published read is `@engine/site/seo/published`.
 */
export * from './metadata'
export * from './json-ld'
export * from './robots'
export * from './sitemap'
