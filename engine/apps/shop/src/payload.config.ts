/**
 * The shop app's Payload config: the shop's own CMS (`@engine/cms-shop`), so the app's admin
 * mount, REST routes and `payload` CLI run (from this folder) all build the one config.
 */
export { default, buildShopConfig, shopConfig } from '@engine/cms-shop/payload.config'
