/** Pure key-matching so the panel's Escape handling is testable without a DOM. */
export function isEscapeKey(event: { readonly key: string }): boolean {
  return event.key === 'Escape'
}

/**
 * Enter sends and Shift+Enter makes a new line — except while an input method (an IME composing
 * Japanese or Chinese, say) is using Enter to confirm its own text.
 */
export function isSendKey(event: {
  readonly key: string
  readonly shiftKey: boolean
  readonly isComposing?: boolean
}): boolean {
  return event.key === 'Enter' && !event.shiftKey && event.isComposing !== true
}
