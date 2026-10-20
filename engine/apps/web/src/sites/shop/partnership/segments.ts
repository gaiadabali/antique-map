/**
 * "What are you buying for?" (the redesign of 2026-10-20, the handoff's apply form): a shop, a
 * company, or a hotel or villa. The choice renames three fields — who they are, how much, and the
 * context — and the button and reply promise under them; the server folds the answers into the
 * lead's message (`composeMessage`), so the lead service and its one validator stay as they are.
 * The words are the shop's lexicon; the keys and neutral defaults are here.
 */
import { createMessages, defineMessages } from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { SITE_COPY } from '../../../shell/copy'
import { isSegment, type Segment, type SegmentText, type SegmentWords } from './segment-kinds'

export { SEGMENTS, isSegment, type Segment, type SegmentText } from './segment-kinds'

export const SEGMENT_MESSAGES = defineMessages({
  'partnership.segmentLabel': 'What are you buying for?',
  'partnership.segment.reseller': 'A shop',
  'partnership.segment.company': 'A company',
  'partnership.segment.hotel': 'A hotel or villa',
  'partnership.field.reseller.org': 'Shop name',
  'partnership.field.reseller.scale': 'How many outlets?',
  'partnership.field.reseller.context': 'What do your customers buy most?',
  'partnership.field.reseller.submit': 'Apply as a reseller',
  'partnership.field.reseller.reply': 'Approved in about two working days',
  'partnership.field.company.org': 'Company name',
  'partnership.field.company.scale': 'How many pieces? (from 25)',
  'partnership.field.company.context': 'What is the occasion, and when do you need them?',
  'partnership.field.company.submit': 'Request a quote',
  'partnership.field.company.reply': 'Quote and sample within two working days',
  'partnership.field.hotel.org': 'Hotel or villa name',
  'partnership.field.hotel.scale': 'How many rooms or walls?',
  'partnership.field.hotel.context': 'Which island or theme suits the property?',
  'partnership.field.hotel.submit': 'Request samples',
  'partnership.field.hotel.reply': 'A sample piece sent before you commit',
  'partnership.formMore': 'Anything else? (optional)',
  'partnership.formPromise':
    'We will only write back about this application — never anything more.',
})

export type SegmentKey = keyof typeof SEGMENT_MESSAGES

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
    segments: { reseller: words('reseller'), company: words('company'), hotel: words('hotel') },
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
  const segment = isSegment(answers.segment) ? answers.segment : 'reseller'
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
