/** Pure key-matching so the panel's Escape handling is testable without a DOM. */
export function isEscapeKey(event: { readonly key: string }): boolean {
  return event.key === 'Escape'
}
