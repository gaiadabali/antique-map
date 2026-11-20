/**
 * The suggested starts: buttons that wrap — under the greeting (the gallery) or in the tray above
 * the composer under a small-capitals "Suggested questions" (the shop's handoff, `showLabel`).
 * Choosing one sends it at once — the visitor asked a question by tapping it, so there is no second
 * tap. Disabled (not hidden) until the session is ready or while a reply is streaming.
 */
import styles from './chat-suggestions.module.css'

/** One panel per page, so one label: a fixed id, as the composer's (and no hook, so it renders plainly). */
const LABEL_ID = 'chat-suggestions-label'

export function ChatSuggestions({
  label,
  suggestions,
  disabled,
  showLabel = false,
  onPick,
}: {
  readonly label: string
  readonly suggestions: readonly string[]
  readonly disabled: boolean
  /** The label written above the buttons; otherwise it is the group's accessible name only. */
  readonly showLabel?: boolean
  readonly onPick: (suggestion: string) => void
}): React.ReactElement | null {
  if (suggestions.length === 0) return null
  const chips = (
    <div
      className={styles.chips}
      role="group"
      {...(showLabel ? { 'aria-labelledby': LABEL_ID } : { 'aria-label': label })}
    >
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          className={styles.chip}
          disabled={disabled}
          onClick={() => onPick(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  )
  if (!showLabel) return chips
  return (
    <div className={styles.labelled}>
      <p id={LABEL_ID} className={styles.label}>
        {label}
      </p>
      {chips}
    </div>
  )
}
