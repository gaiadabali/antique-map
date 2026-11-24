/**
 * Two small decisions the thread makes, kept pure so they are testable without a browser: what the
 * agent's opening line says, and whether the "typing" dots show.
 */
import type { ChatState } from './chat-reducer'
import type { ChatPanelText } from './lexicon/types'
import type { SiteKey } from './types'

/**
 * The agent's greeting, in the site's own words. Opened from an item or product page it names that
 * page's title (`useChatPageInfo`); the title is plain text, never markup.
 */
export function greetingText(text: ChatPanelText, site: SiteKey, title: string | null): string {
  if (title === null) return text[`greeting.${site}`]
  return text[`greetingItem.${site}`].replace('{title}', title)
}

/**
 * True from the moment the visitor sends until the assistant's first words arrive — the dots show
 * while there is nothing yet to read. Once text is streaming, or the model has sent a status line,
 * a card or a handoff, the thread itself shows that something is happening.
 */
export function awaitingReply(state: Pick<ChatState, 'streaming' | 'entries'>): boolean {
  if (!state.streaming) return false
  const last = state.entries[state.entries.length - 1]
  return last === undefined || last.kind === 'user'
}
