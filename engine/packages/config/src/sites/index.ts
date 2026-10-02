/**
 * `@engine/config/sites` — the two sites (DR-1): the committed `SITES` table, which host picks
 * which site (`siteFromHost()`, against the `GALLERY_HOSTS` / `SHOP_HOSTS` allow-list), the
 * origins every absolute URL is built on, and each site's routes. No file is read and no database
 * touched: the proxy runs this on every request.
 */
export * from './hosts'
export * from './routes'
export * from './table'
