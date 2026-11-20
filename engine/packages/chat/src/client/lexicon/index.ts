/**
 * `chatPanelText(locale, site)` — the panel's words, resolved on the server (CONVENTIONS.md §6:
 * copy never ships as a lexicon to the browser; the caller passes the resolved strings down as
 * props, the same pattern as `zoom-lazy.tsx`'s labels). `{site}` is filled here; `{title}` and
 * `{reference}` stay as placeholders for the panel to fill at runtime, since both are page- or
 * reply-specific. `ChatPanelCopyKey`/`ChatPanelText` live in `./types` (no `server-only`), so the
 * client components can import the type without pulling this module's JSON reads into their bundle.
 */
import 'server-only'

import { SITES, type SiteKey, type SiteLocale } from '@engine/config/sites'

import EN from './en.json'
import ID from './id.json'
import type { ChatPanelCopyKey, ChatPanelText } from './types'

export type { ChatPanelCopyKey, ChatPanelText }

const LEXICONS: Record<SiteLocale, Record<ChatPanelCopyKey, string>> = { en: EN, id: ID }

export function chatPanelText(locale: SiteLocale, site: SiteKey): ChatPanelText {
  const words = LEXICONS[locale] ?? EN
  const siteName = SITES[site].name
  const resolved: Record<string, string> = {}
  for (const key of Object.keys(words) as ChatPanelCopyKey[]) {
    resolved[key] = words[key].replace(/\{site\}/g, siteName)
  }
  return resolved as ChatPanelText
}

/** The 3–4 suggested starts for `site`, in order, resolved server-side for the panel's props. */
export function suggestedStarts(text: ChatPanelText, site: SiteKey): readonly string[] {
  const prefix = `suggest.${site}.`
  return (Object.keys(text) as ChatPanelCopyKey[])
    .filter((key) => key.startsWith(prefix))
    .sort()
    .map((key) => text[key])
}
