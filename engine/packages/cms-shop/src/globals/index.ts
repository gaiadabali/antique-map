/**
 * Every global in the shop's CMS: its settings (`./site-settings`, the `shop` group), the header
 * and the footer (`./shop-header`, `./shop-footer`; TASKS.md 27.1.a).
 */
import type { GlobalConfig } from 'payload'

import { ShopFooter } from './shop-footer'
import { ShopHeader } from './shop-header'
import { SiteSettings } from './site-settings'

export const SHOP_GLOBALS: readonly GlobalConfig[] = [SiteSettings, ShopHeader, ShopFooter]

export { ShopFooter, ShopHeader, SiteSettings }
