/**
 * "What would you like?" (TASKS.md 28.2; the owner's feedback of 2026-11-19): become a retailer, or
 * customised wholesale products — the lead's `partnershipType`. The choice renames three fields —
 * who they are, how much, and the context — and the button and reply promise under them; the
 * server folds the answers into the lead's message (`composeMessage`). The words are the shop's lexicon; the keys and neutral defaults are here.
 */
import { createMessages, defineMessages } from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { SITE_COPY } from '../../../shell/copy'
import { isSegment, type Segment, type SegmentText, type SegmentWords } from './segment-kinds'

export { SEGMENTS, isSegment, type Segment, type SegmentText } from './segment-kinds'

export const SEGMENT_MESSAGES = defineMessages({
  'partnership.segmentLabel': 'What would you like?',
  'partnership.segment.retailer': 'Become a Retailer',
  'partnership.segment.wholesale': 'Customised Wholesale Products',
  'partnership.field.retailer.org': 'Shop name',
  'partnership.field.retailer.scale': 'How many outlets?',
  'partnership.field.retailer.context': 'Where is your shop, and what do your customers buy most?',
  'partnership.field.retailer.submit': 'Send retailer enquiry',
  'partnership.field.retailer.reply': 'We reply by email',
  'partnership.field.wholesale.org': 'Company, hotel or villa name',
  'partnership.field.wholesale.scale': 'How many pieces?',
  'partnership.field.wholesale.context': 'What would you like made, and when do you need it?',
  'partnership.field.wholesale.submit': 'Request a quote',
  'partnership.field.wholesale.reply': 'We reply with a quote by email',
  'partnership.formMore': 'Anything else? (optional)',
  'partnership.formPromise':
    'We will only write back about this application — never anything more.',
  'partnership.formPrivacy': 'Privacy notice',
})

export function segmentText(locale: SiteLocale): SegmentText {
  const { t } = createMessages({
    defaults: SEGMENT_MESSAGES,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.shop,
  })
  const words = (segment: Segment): SegmentWords => ({
    label: t(`partnership.segment.${segment}`),
    org: t(`partnership.field.${segment}.org`),
    scale: t(`partnership.field.${segment}.scale`),
    context: t(`partnership.field.${segment}.context`),
    submit: t(`partnership.field.${segment}.submit`),
    reply: t(`partnership.field.${segment}.reply`),
  })
  return {
    question: t('partnership.segmentLabel'),
    more: t('partnership.formMore'),
    promise: t('partnership.formPromise'),
    privacy: t('partnership.formPrivacy'),
    segments: { retailer: words('retailer'), wholesale: words('wholesale') },
  }
}

/**
 * The lead's message from the apply form's answers: the choice and each answered field on its own
 * line, labelled as the visitor saw it, then their free note. Empty answers are left out.
 */
export function composeMessage(
  locale: SiteLocale,
  answers: {
    readonly segment: string
    readonly org: string
    readonly scale: string
    readonly context: string
    readonly more: string
  },
): string {
  const text = segmentText(locale)
  const segment = isSegment(answers.segment) ? answers.segment : 'retailer'
  const words = text.segments[segment]
  const lines = [
    `${text.question} ${words.label}`,
    ...(
      [
        [words.org, answers.org],
        [words.scale, answers.scale],
        [words.context, answers.context],
      ] as const
    )
      .filter(([, value]) => value.trim() !== '')
      .map(([label, value]) => `${label}: ${value.trim()}`),
  ]
  const more = answers.more.trim()
  return more === '' ? lines.join('\n') : `${lines.join('\n')}\n\n${more}`
}
