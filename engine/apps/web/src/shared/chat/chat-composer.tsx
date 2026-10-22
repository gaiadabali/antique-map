'use client'

/**
 * The composer: an auto-growing textarea (one to four lines, the body face) and its send button,
 * which becomes a Stop button while a reply streams — a round icon inside one rounded row (the
 * gallery), or the words "Send" / "Stop" on a solid button beside a ruled field (the shop's
 * handoff, `sendAs="text"`). Enter sends,
 * Shift+Enter starts a new line. The label stays for assistive technology, visually hidden. The
 * textarea is never disabled while the session starts — the visitor can type at once, and Send
 * enables when the session is ready — only when the session has failed.
 */
import { useEffect, type RefObject } from 'react'

import { SendIcon, StopIcon } from './chat-icons'
import { isSendKey } from './keys'
import type { ChatPanelText } from './lexicon/types'
import styles from './chat-composer.module.css'

/** Enter sends (and is kept out of the textarea); Shift+Enter falls through as a new line. */
export function handleComposerKeyDown(
  event: {
    readonly nativeEvent: {
      readonly key: string
      readonly shiftKey: boolean
      readonly isComposing?: boolean
    }
    readonly preventDefault: () => void
  },
  onSend: () => void,
): void {
  if (!isSendKey(event.nativeEvent)) return
  event.preventDefault()
  onSend()
}

export function ChatComposer({
  text,
  value,
  maxChars,
  streaming,
  canSend,
  disabled,
  sendAs = 'icon',
  textareaRef,
  onChange,
  onSend,
  onStop,
}: {
  readonly text: ChatPanelText
  readonly value: string
  readonly maxChars: number
  readonly streaming: boolean
  readonly canSend: boolean
  readonly disabled: boolean
  readonly sendAs?: 'icon' | 'text'
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>
  readonly onChange: (value: string) => void
  readonly onSend: () => void
  readonly onStop: () => void
}): React.ReactElement {
  // Grow to the content (the CSS caps it at four lines, then it scrolls).
  useEffect(() => {
    const element = textareaRef.current
    if (element === null) return
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }, [value, textareaRef])

  const field = (
    <textarea
      id="chat-composer"
      ref={textareaRef}
      className={styles.input}
      rows={1}
      value={value}
      maxLength={maxChars}
      placeholder={text.composerPlaceholder}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => handleComposerKeyDown(event, onSend)}
    />
  )

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault()
        onSend()
      }}
    >
      <label htmlFor="chat-composer" className={styles.label}>
        {text.composerLabel}
      </label>
      {sendAs === 'text' ? (
        <div className={styles.row}>
          <div className={styles.box}>{field}</div>
          {streaming ? (
            <button type="button" className={styles.textAction} onClick={onStop}>
              {text.stop}
            </button>
          ) : (
            // always ready to press, as drawn: an empty or early send is ignored by the panel
            <button type="submit" className={styles.textAction} disabled={disabled}>
              {text.send}
            </button>
          )}
        </div>
      ) : (
        <div className={styles.field}>
          {field}
          {streaming ? (
            <button
              type="button"
              className={styles.action}
              aria-label={text.stop}
              title={text.stop}
              onClick={onStop}
            >
              <StopIcon className={styles.icon} />
            </button>
          ) : (
            <button
              type="submit"
              className={styles.action}
              aria-label={text.send}
              title={text.send}
              disabled={!canSend}
            >
              <SendIcon className={styles.icon} />
            </button>
          )}
        </div>
      )}
    </form>
  )
}
