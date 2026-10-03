/** `chatCopy(locale)` — the chat's words for one locale, with `{name}` placeholders filled. */
import 'server-only'

import { SITES } from '@engine/config/sites'

import type { SiteKey, SiteLocale } from '../types'
import { EN, type ChatCopyKey } from './en'
import { ID } from './id'

export type { ChatCopyKey }

const LEXICONS: Record<SiteLocale, Record<ChatCopyKey, string>> = { en: EN, id: ID }

export type ChatCopy = (key: ChatCopyKey, params?: Readonly<Record<string, string>>) => string

export function chatCopy(locale: SiteLocale, site: SiteKey): ChatCopy {
  const words = LEXICONS[locale] ?? EN
  const base = { site: SITES[site].name }
  return (key, params) => {
    const all: Record<string, string> = { ...base, ...params }
    return words[key].replace(/\{(\w+)\}/g, (match, name: string) => all[name] ?? match)
  }
}

/** The consent line's version: stored on the lead with the time it was accepted (AI.md §4). */
export const CONSENT_VERSION = 'chat-consent-2026-10'
