/**
 * The vocabulary seed's storefront step (TASKS.md 28.1; the owner's feedback of 2026-11-19), run by
 * both CMSes' vocabulary seeds after the settings' once-only defaults:
 *
 * - **themes** — Bali, Java, Singapore, Botanicals: matched by English name folded, created when
 *   missing with the Indonesian name beside it, published with `publish` (a draft one too).
 *   Nothing else about an existing theme changes: the owner's edits are theirs.
 * - **the promotions' words** — the same-day promise and the newsletter pop-up
 *   (`STOREFRONT_COPY`), written in each language whose banner text is still empty (a database
 *   seeded before 28.1), or holds the English words in Indonesian; once each has its own, nothing.
 *
 * No store is made a flagship: which two they are is the owner's (F4).
 */
import { fold } from '@engine/cms-core/import/vocabulary'
import type { Payload, PayloadRequest } from 'payload'

import { STOREFRONT_COPY } from '../../globals/site-settings/shop/storefront'
import { reqOf } from '../req'

export const THEME_SEEDS = [
  { label: 'Bali', labelId: 'Bali' },
  { label: 'Java', labelId: 'Jawa' },
  { label: 'Singapore', labelId: 'Singapura' },
  { label: 'Botanicals', labelId: 'Botani' },
] as const

export type StorefrontReport = {
  themes: { created: number; present: number; published: number }
  promotions: 'seeded' | 'present'
}

type Doc = { id: number; label?: unknown; _status?: unknown }

const englishOf = (value: unknown): string =>
  typeof value === 'string' ? value : ((value as { en?: string } | undefined)?.en ?? '')

async function seedThemes(
  payload: Payload,
  req: PayloadRequest,
  publish: boolean,
  report: StorefrontReport,
): Promise<void> {
  const { docs } = await payload.find({
    collection: 'themes',
    req,
    overrideAccess: true,
    depth: 0,
    pagination: false,
    select: { label: true, _status: true },
  })
  for (const seed of THEME_SEEDS) {
    const hit = (docs as unknown as Doc[]).find(
      (doc) => fold(englishOf(doc.label)) === fold(seed.label),
    )
    if (hit) {
      report.themes.present += 1
      if (publish && hit._status !== 'published') {
        await payload.update({
          collection: 'themes',
          id: hit.id,
          data: { _status: 'published' } as never,
          req,
        })
        report.themes.published += 1
      }
      continue
    }
    const created = (await payload.create({
      collection: 'themes',
      data: { label: seed.label, _status: publish ? 'published' : 'draft' } as never,
      req,
    })) as unknown as { id: number }
    await payload.update({
      collection: 'themes',
      id: created.id,
      locale: 'id',
      data: { label: seed.labelId } as never,
      req: reqOf(payload, 'id', req.context),
    })
    report.themes.created += 1
    if (publish) report.themes.published += 1
  }
}

type Promotions = { shop?: { promo?: { text?: string | null } } }

async function seedPromotions(
  payload: Payload,
  req: PayloadRequest,
): Promise<'seeded' | 'present'> {
  let seeded = false
  for (const locale of ['en', 'id'] as const) {
    const settings = (await payload.findGlobal({
      slug: 'site-settings',
      req: reqOf(payload, locale, req.context),
      locale,
      fallbackLocale: false as never,
      depth: 0,
    })) as unknown as Promotions
    const text = (settings.shop?.promo?.text ?? '').trim()
    // Blank, or the English words a first save wrote in this language too: the defaults are due.
    if (text !== '' && (locale === 'en' || text !== STOREFRONT_COPY.promoText.en)) continue
    seeded = true
    await payload.updateGlobal({
      slug: 'site-settings',
      locale,
      data: {
        shop: {
          promo: {
            text: STOREFRONT_COPY.promoText[locale],
            condition: STOREFRONT_COPY.promoCondition[locale],
          },
          newsletter: {
            title: STOREFRONT_COPY.newsletterTitle[locale],
            text: STOREFRONT_COPY.newsletterText[locale],
          },
        },
      } as never,
      req: reqOf(payload, locale, req.context),
    })
  }
  return seeded ? 'seeded' : 'present'
}

export async function seedStorefront(
  payload: Payload,
  req: PayloadRequest,
  options: { publish?: boolean } = {},
): Promise<StorefrontReport> {
  const report: StorefrontReport = {
    themes: { created: 0, present: 0, published: 0 },
    promotions: 'present',
  }
  await seedThemes(payload, req, options.publish === true, report)
  report.promotions = await seedPromotions(payload, req)
  return report
}

/** One line for the CLI's report. */
export function renderStorefront(report: StorefrontReport): string {
  const { themes } = report
  return (
    `storefront: themes ${themes.created} created / ${themes.present} present` +
    ` (${themes.published} published), promotions ${report.promotions}`
  )
}
