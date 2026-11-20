/**
 * `@engine/config/sites` — the two sites (DR-1): the committed `SITES` table, which host picks
 * which site (`siteFromHost()`, against the `GALLERY_HOSTS` / `SHOP_HOSTS` allow-list), the
 * origins every absolute URL is built on, and each site's routes. Under Plan v2 (DR-17) each app
 * serves one site from its own `SITE_HOSTS` and `ADMIN_HOST` (`./app-hosts`). No file is read and
 * no database touched: the proxy runs this on every request.
 */
export * from './app-hosts'
export * from './hosts'
export * from './routes'
export * from './table'
