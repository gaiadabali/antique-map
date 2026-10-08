/**
 * The suggested starts under the greeting: pill buttons that wrap. Choosing one sends it at once —
 * the visitor asked a question by tapping it, so there is no second tap. Disabled (not hidden)
 * until the session is ready or while a reply is streaming.
 */
import styles from './chat-suggestions.module.css'

export function ChatSuggestions({
  label,
  suggestions,
  disabled,
  onPick,
}: {
  readonly label: string
  readonly suggestions: readonly string[]
  readonly disabled: boolean
  readonly onPick: (suggestion: string) => void
}): React.ReactElement | null {
  if (suggestions.length === 0) return null
  return (
    <div className={styles.chips} role="group" aria-label={label}>
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
}
