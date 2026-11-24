/**
 * The shop home's first content, seeded once into the CMS (`../pages`) and never drawn by the site
 * itself (TASKS.md 27.5.b): the sections the redesign of 2026-10-20 drew, in the same order, with
 * the lexicon's words, so an editor starts from the page as it was designed. Since the owner's
 * feedback of 2026-11-19 (TASKS.md 28.2): the hero's call is "Shop", to the shop page, and the
 * order is Shop by, How We Make Them, Partnerships, the Antiques — the site places Wall Decor, the
 * latest articles and the stores between them (`sites/shop/sections/home-order`).
 */
import type { SiteLocale } from '@engine/config/sites'

import type { ShopBlockVM } from '../../blocks'
import { homeText } from '../../../../../sites/shop/home/home-messages'

export function defaultHomeBlocks(
  locale: SiteLocale,
  href: (surface: 'browse' | 'partnership') => string,
): readonly ShopBlockVM[] {
  const t = homeText(locale)
  return [
    {
      type: 'homeHero',
      id: 'home-hero',
      title: t('home.shop.title'),
      lede: t('home.shop.lede'),
      primary: { label: t('home.shop.ctaShop'), href: href('browse'), external: false },
      secondary: { label: t('home.shop.ctaProcess'), href: '#process', external: false },
      signals: [
        t('home.shop.signalRestored'),
        t('home.shop.signalBali'),
        t('home.shop.signalShops'),
      ],
      image: null,
    },
    {
      type: 'categoryRail',
      id: 'home-shop-by',
      title: t('home.shop.chipsEyebrow'),
      linkLabel: t('home.shop.setsCta'),
    },
    {
      type: 'steps',
      id: 'home-process',
      anchor: 'process',
      title: t('home.shop.processTitle'),
      steps: [
        { title: t('home.shop.processStep1Title'), body: t('home.shop.processStep1Body') },
        { title: t('home.shop.processStep2Title'), body: t('home.shop.processStep2Body') },
        { title: t('home.shop.processStep3Title'), body: t('home.shop.processStep3Body') },
      ],
    },
    {
      type: 'story',
      id: 'home-trade',
      title: t('home.shop.tradeTitle'),
      lead: t('home.shop.tradeLead'),
      body: t('home.shop.tradeBodyMore'),
      facts: [t('home.shop.tradeFact1'), t('home.shop.tradeFact3')],
      link: { label: t('home.shop.tradeCta'), href: href('partnership'), external: false },
    },
    {
      type: 'originals',
      id: 'home-originals',
      label: t('home.shop.originalsLabel'),
      title: t('home.shop.originalsTitle'),
      body: t('home.shop.originalsBody'),
      linkLabel: t('home.shop.originalsCta'),
    },
  ]
}
